'use server';

import { generateObject, generateImage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";

const mockResponse = {
  scene_description: "A wide-angle, elevated street view of an intersection on a cloudy day. There are prominent green trees and multi-story residential blocks (HDB flats) in the background.",
  modifications: [
    { 
      y: 65, 
      x: 35, 
      issue_identified: "High pedestrian exposure due to 90s red light.", 
      proposed_change: "Elevated Pedestrian Refuge Island", 
      justification: "Accommodates slower elderly walking speeds from Blk 535 and students from Montfort.",
      estimated_cost: "$45,000"
    },
    { 
      y: 85, 
      x: 20, 
      issue_identified: "Vehicles swerving/crashing can easily mount the flush pavement at the pedestrian crossing.", 
      proposed_change: "Impact-Resistant Steel Bollards", 
      justification: "Creates a physical barrier to protect waiting pedestrians from errant vehicles, preventing pavement mounting.",
      estimated_cost: "$12,500"
    },
    { 
      y: 75, 
      x: 80, 
      issue_identified: "Speeding slip road (87 violations).", 
      proposed_change: "Narrowed slip road with textured speed bumps", 
      justification: "Forces heavy vehicles to slow down before the zebra crossing.",
      estimated_cost: "$28,000"
    }
  ]
};

const blueprintSchema = z.object({
  scene_description: z.string().describe("A highly detailed visual description of the original intersection seen in the video, including camera angle (e.g., CCTV street level view, top-down), weather, lighting, surrounding buildings, trees, and exact road layout (e.g., T-junction, crossroad). This will be used as a prompt for an image generator."),
  modifications: z.array(z.object({
    y: z.number().describe("Y coordinate percentage for the pin (0-100)"),
    x: z.number().describe("X coordinate percentage for the pin (0-100)"),
    issue_identified: z.string().describe("The hazard found in the original intersection"),
    proposed_change: z.string().describe("The new physical infrastructure added"),
    justification: z.string().describe("Why this change mitigates the hazard"),
    estimated_cost: z.string().describe("Estimated implementation cost, e.g., '$45,000'")
  }))
});

export type BlueprintResponse = z.infer<typeof blueprintSchema>;

export type BlueprintResult = {
  data: BlueprintResponse;
  imageBase64: string | null;
};

export async function generateBlueprint(): Promise<BlueprintResult> {
  let blueprintData: BlueprintResponse = mockResponse;
  let imageBase64: string | null = null;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  try {
    const videoPath = path.join(process.cwd(), 'public', 'mock-cctv.mp4');
    let videoUri: string | null = null;
    
    // 1. Upload the Video to Gemini's File API for Context
    if (apiKey && fs.existsSync(videoPath)) {
      const ai = new GoogleGenAI({ apiKey });
      console.log("[Krashless] Uploading CCTV footage to Gemini File Manager...");
      const myfile = await ai.files.upload({
        file: videoPath,
        config: {
          mimeType: "video/mp4",
          displayName: "Intersection CCTV Footage",
        }
      });
      
      let fileStatus = await ai.files.get({ name: myfile.name! });
      while (fileStatus.state === "PROCESSING") {
        console.log("[Krashless] Waiting for Gemini to process video...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        fileStatus = await ai.files.get({ name: myfile.name! });
      }
      
      if (fileStatus.state === "ACTIVE") {
        videoUri = fileStatus.uri!;
      } else {
        console.warn("[Krashless] Video processing failed on Gemini's end.");
      }
    }

    // 2. Generate Object using Video Context
    const systemPrompt = `Evaluate the intersection at Hougang Ave 8 (Blk 535). 
It is a school zone with heavy student traffic and an elderly population.
It has a high volume of heavy vehicles and buses.
There have been 142 red light violations and 87 speeding violations this year.
Pedestrians are exposed for a 90s red light.

Generate a modernization blueprint recommending 3 infrastructure modifications to mitigate these hazards. Return exact x, y percentages for the pins on an overhead/CCTV perspective image where the changes should be placed.`;

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          ...(videoUri ? [{ type: "file", data: videoUri, mediaType: "video/mp4" }] : [])
        ]
      }
    ];

    console.log("[Krashless] Analyzing Hazard Vectors with gemini-3.1-pro-preview...");
    const { object } = await generateObject({
      model: google('gemini-3.1-pro-preview'),
      schema: blueprintSchema,
      messages: messages,
    });
    
    blueprintData = object;
  } catch (error) {
    console.error("Failed to generate blueprint from Gemini, falling back to mock data", error);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 3. Generate the Image using Nano Banana 2 (Gemini Flash Image Preview)
  try {
    const modificationsText = blueprintData.modifications.map(m => m.proposed_change).join(", ");
    const imagePrompt = `Photorealistic, 8k resolution. Modifying this existing intersection to include the following infrastructure deltas: ${modificationsText}. 
CRITICAL: You must preserve the original background, trees, buildings, weather, lighting, and exact camera perspective. Treat this as an architectural inpainting task. Only overlay the modernized infrastructure cleanly onto the existing scene.`;

    console.log("[Krashless] Generating Modernized Blueprint Image via gemini-3.1-flash-image-preview using source thumbnail...");
    
    // Read the original thumbnail image as a buffer to pass to the model
    const sourceImagePath = path.join(process.cwd(), 'public', 'mock-cctv.jpg');
    let imagePayload: any = { text: imagePrompt };
    
    if (fs.existsSync(sourceImagePath)) {
      const sourceImage = fs.readFileSync(sourceImagePath);
      imagePayload = {
        text: imagePrompt,
        images: [sourceImage]
      };
    }

    const { image } = await generateImage({
      model: google.image('gemini-3.1-flash-image-preview'),
      prompt: imagePayload,
      aspectRatio: "16:9",
    });

    if (image && image.base64) {
      imageBase64 = `data:image/jpeg;base64,${image.base64}`;
      console.log("[Krashless] Image generated successfully.");
    }
  } catch (error) {
    console.error("Failed to generate image via Nano Banana 2:", error);
  }

  return { data: blueprintData, imageBase64 };
}
