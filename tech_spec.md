


This is a massive upgrade to the flow. Your discussion actually maps out a much more realistic, "GovTech Command Center" user experience. 

Starting with a **macro view (Map of Singapore -> Hotspot)** and zooming into the **micro view (Live CCTV -> Blueprint)** tells a much better story for the judges. Also, switching to interactive pulsing pins (instead of just static bounding boxes) is a brilliant UX choice.

*(Side note: Your transcription app transcribing whatever AI you mentioned as "Nano banana" is hilarious, but I'll assume you meant a generic image/video generator and we will stick to the Veo video plan!)*

Here is the fully updated, highly detailed spec for **Crashless**, incorporating Vercel's AI SDK, the single Hougang hotspot, the video CCTV, and the interactive map flow.

Copy this exact block and feed it to OpenCode:

***

# SYSTEM DIRECTIVE FOR OPENCODE CLI
You are an expert Next.js developer and AI Integration Specialist. Your objective is to build a fully functional prototype for "Crashless" (a generative urban prototyping tool for LTA). You are acting as an autonomous agent: read this specification, plan the architecture, and execute the build step-by-step.

**STRICT RULES:**
1. Do not make arbitrary design decisions. 
2. Do not use Python or Streamlit. 
3. Everything must be built in Next.js 14+ (App Router) with TypeScript and Tailwind CSS.
4. **NEVER** use the words "Analyze" or "Analysis" in the UI. Use "Simulate Modernization Blueprint", "Identify Hotspots", or "Ingest Spatial Data".

## 1. Tech Stack & Initialization
- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS (Dark mode default, sleek "Command Center" aesthetic: `bg-slate-950`, `text-slate-100`)
- **Icons & Animation:** `lucide-react`, `framer-motion`
- **AI SDK:** Vercel AI SDK (`ai`, `@ai-sdk/google`, `zod`)
- **Maps:** Google Maps `<gmp-map-3d>` web component.

**Init Command (Simulated):** 
`npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
**Dependencies:** 
`npm install ai @ai-sdk/google zod framer-motion lucide-react`

## 2. Environment Variables & Assets (Assumed Presence)
Write your code expecting these to exist:
- **`.env.local`:**
  - `GOOGLE_GENERATIVE_AI_API_KEY`: Used by Vercel AI SDK for Gemini.
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Injected into the frontend for the 3D map.
- **`public/` directory:**
  - `/mock-cctv.mp4`: The "live" footage of Hougang Ave 8.
  - `/veo-after.mp4`: The generative video showing the modernized intersection.

## 3. Mock Data & Global Constants (`src/data/mockData.ts`)
```typescript
export const HOTSPOT = { 
  id: 'hg-8-535', 
  name: 'Hougang Ave 8 (Blk 535 Intersection)', 
  lat: 1.373, 
  lng: 103.886 
};

export const LTA_ZONING_DATA = {
  demographics: "High elderly population (Block 535), proximity to Montfort School.",
  traffic_profile: "High volume of heavy vehicles, SBS Transit double-decker route.",
  historical_incidents: "Frequent pedestrian near-misses on slip road during heavy rain."
};

export const INITIAL_LIVE_STATS = { vehicles: 1405, pedestrians: 842, heavy_trucks: 210 };
```

## 4. The Core Application Flow & State Machine
Create a single-page dashboard (`src/app/page.tsx`) with a full-height layout (`h-screen w-full flex flex-col`). 
Manage the flow with state: 
`const [viewState, setViewState] = useState<'map' | 'live-cctv' | 'generating' | 'blueprint'>('map');`

### State 1: 'map' (Macro View)
- Load the Google Maps 3D script dynamically.
- Mount `<gmp-map-3d>` centered on Singapore.
- Place a highly visible, pulsing red/amber marker at the `HOTSPOT` coordinates.
- Hovering the marker shows a tooltip: "High-Risk Intersection Identified".
- `onClick` the marker -> `setViewState('live-cctv')`.

### State 2: 'live-cctv' (Micro View & Data Ingestion)
- **Layout:** Two columns.
- **Left Panel:** Displays `LTA_ZONING_DATA` and `INITIAL_LIVE_STATS` (use a `useEffect` to tick the stats up randomly to simulate live traffic).
- **Main Viewport:** Render `<video src="/mock-cctv.mp4" autoPlay loop muted className="w-full h-full object-cover rounded-xl" />`.
- **Action:** At the bottom of the video, a glowing primary button: **"Simulate Modernization Blueprint"**.
- `onClick` -> `setViewState('generating')` AND trigger the Server Action.

### State 3: 'generating' (AI Thinking Process)
- Dark loading screen overlay.
- Display a simulated terminal/console that streams text: *"Ingesting Spatial Data... Evaluating Heavy Vehicle turning radius... Computing Pedestrian Refuge limits... Generating Blueprints via Gemini 3.1 Pro..."*

### State 4: 'blueprint' (Interactive Veo Output)
- Render `<video src="/veo-after.mp4" autoPlay loop muted className="w-full h-full object-cover rounded-xl relative" />`.
- **The Interactive Pins (CRITICAL):**
  Iterate over the `modifications` array returned from the Server Action. Coordinates are normalized (0 to 100).
  Render absolutely positioned pulsing rings over the video wrapper.
  When a user clicks a pin, open a small glassmorphism tooltip next to it showing the `element` and `reasoning`.
  ```tsx
  {modifications.map((mod, i) => (
    <div key={i} className="absolute group" style={{ top: `${mod.y}%`, left: `${mod.x}%` }}>
      {/* Pulsing Dot */}
      <div className="w-6 h-6 bg-red-500 rounded-full animate-ping absolute opacity-75"></div>
      <button 
        className="w-6 h-6 bg-red-600 border-2 border-white rounded-full relative z-10 cursor-pointer"
        onClick={() => setActiveTooltip(i)}
      />
      {/* Tooltip */}
      {activeTooltip === i && (
        <div className="absolute top-8 left-0 w-64 p-3 bg-slate-900/90 border border-emerald-500 rounded-lg text-sm text-white backdrop-blur-md z-20">
          <strong className="text-emerald-400 block mb-1">{mod.element}</strong>
          {mod.reasoning}
        </div>
      )}
    </div>
  ))}
  ```

## 5. Server Action (`src/app/actions.ts`)
Create a Next.js server action to handle the Gemini API call using the Vercel AI SDK.
- Function: `export async function generateBlueprint()`
- **Behavior:**
  - Use `generateObject` from `ai`.
  - Model: `google('gemini-3.1-pro')`.
  - Use Zod to enforce this exact schema:
    ```typescript
    z.object({
      modifications: z.array(z.object({
        y: z.number().describe("Y coordinate percentage (0-100)"),
        x: z.number().describe("X coordinate percentage (0-100)"),
        element: z.string(),
        reasoning: z.string()
      }))
    })
    ```
  - **Fallback:** Wrap the API call in a `try/catch`. If it fails (e.g., missing API key or bad Wi-Fi during local dev/demo), return a hardcoded JSON matching the schema after a 3-second delay to guarantee the stage demo works perfectly.
    *Mock Fallback Data:* 
    `[{ y: 65, x: 35, element: "Expanded Pedestrian Island", reasoning: "Accommodates slower elderly walking speeds from Blk 535." }, { y: 75, x: 80, element: "Narrowed Slip Road", reasoning: "Forces heavy vehicles to slow down." }]`

## 6. Execution Steps for OpenCode CLI
1. Initialize project and install all specified dependencies (especially Vercel AI SDK).
2. Scaffold data layer (`mockData.ts`).
3. Scaffold Server Action with `generateObject` and the fail-safe fallback.
4. Build the UI state machine in `page.tsx` transitioning from Map -> Live CCTV -> Loading -> Interactive Blueprint.
5. Implement the CSS math and React state for the clickable pulsing pins.

Execute build immediately without asking for further clarification.
