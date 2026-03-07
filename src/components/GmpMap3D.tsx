"use client";

import React, { useEffect, useState, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

export type MarkerConfig = {
  position: { lat: number; lng: number; altitude: number };
  label?: string;
};

function InnerMap3D(props: {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
  className?: string;
  marker?: MarkerConfig;
  onMarkerClick?: () => void;
}) {
  const maps3d = useMapsLibrary("maps3d");
  const [isDefined, setIsDefined] = useState(false);
  const mapRef = useRef<HTMLElement | null>(null);
  const markerRef = useRef<HTMLElement | null>(null);
  // Store callback in a ref so the event listener always sees the latest value
  const onMarkerClickRef = useRef(props.onMarkerClick);
  onMarkerClickRef.current = props.onMarkerClick;
  
  useEffect(() => {
    if (!maps3d) return;
    customElements.whenDefined("gmp-map-3d").then(() => {
      setIsDefined(true);
    });
  }, [maps3d]);

  useEffect(() => {
    if (isDefined && mapRef.current) {
      Object.assign(mapRef.current, {
        center: props.center,
        tilt: props.tilt,
        heading: props.heading,
        range: props.range,
      });
    }
  }, [isDefined, props.center, props.tilt, props.heading, props.range]);

  // Imperatively create the interactive marker and attach gmp-click listener
  useEffect(() => {
    if (!isDefined || !mapRef.current || !props.marker) return;

    // Clean up any previously appended marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    async function createMarker() {
      const maps3dLib = await google.maps.importLibrary("maps3d") as any;
      const Marker3DInteractiveElement = maps3dLib.Marker3DInteractiveElement;

      const marker = new Marker3DInteractiveElement({
        position: props.marker!.position,
        altitudeMode: "RELATIVE_TO_GROUND",
      });

      // Build custom HTML content for the marker
      const wrapper = document.createElement("div");
      wrapper.setAttribute("slot", "content");
      wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;width:96px;height:96px;margin-top:-40px;";

      // Ping ring
      const ping = document.createElement("div");
      ping.style.cssText = "position:absolute;width:96px;height:96px;border-radius:9999px;background:rgba(239,68,68,0.2);animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;";
      wrapper.appendChild(ping);

      // Pulse ring
      const pulse = document.createElement("div");
      pulse.style.cssText = "position:absolute;width:48px;height:48px;border-radius:9999px;background:rgba(239,68,68,0.4);animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;";
      wrapper.appendChild(pulse);

      // Center dot
      const dot = document.createElement("div");
      dot.style.cssText = "width:40px;height:40px;background:#dc2626;border:2px solid white;border-radius:9999px;display:flex;align-items:center;justify-content:center;z-index:10;box-shadow:0 0 15px rgba(239,68,68,0.8);";
      dot.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
      wrapper.appendChild(dot);

      // Tooltip
      const tooltip = document.createElement("div");
      tooltip.style.cssText = "position:absolute;top:100%;margin-top:16px;white-space:nowrap;background:#0f172a;border:1px solid rgba(239,68,68,0.5);color:#f1f5f9;padding:8px 16px;border-radius:6px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);opacity:0;transition:opacity 0.2s;pointer-events:none;";
      tooltip.innerHTML = `<p style="font-weight:600;color:#f87171;margin:0;">High-Risk Intersection Identified</p><p style="font-size:12px;color:#94a3b8;margin:4px 0 0 0;">Click to view live spatial data</p>`;
      wrapper.appendChild(tooltip);

      // Show tooltip on hover
      wrapper.addEventListener("mouseenter", () => { tooltip.style.opacity = "1"; });
      wrapper.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });

      marker.append(wrapper);

      // Attach the gmp-click event — this is the official way per Google docs
      marker.addEventListener("gmp-click", () => {
        console.log("[Krashless] gmp-click fired on Marker3DInteractiveElement");
        onMarkerClickRef.current?.();
      });

      mapRef.current!.append(marker);
      markerRef.current = marker as unknown as HTMLElement;
    }

    createMarker();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [isDefined, props.marker]);

  if (!maps3d || !isDefined) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/50">Initializing 3D Spatial Engine...</div>;
  }

  // @ts-ignore
  return <gmp-map-3d ref={mapRef} style={{ width: "100%", height: "100%", display: "block" }} mode="SATELLITE" className={props.className} />;
}

export function GmpMap3D(props: {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
  className?: string;
  marker?: MarkerConfig;
  onMarkerClick?: () => void;
}) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string} version="alpha">
      <InnerMap3D {...props} />
    </APIProvider>
  );
}
