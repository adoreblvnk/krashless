"use client";

import React, { useEffect, useState, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

function InnerMap3D(props: {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const maps3d = useMapsLibrary("maps3d");
  const [isDefined, setIsDefined] = useState(false);
  const mapRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!maps3d) return;
    customElements.whenDefined("gmp-map-3d").then(() => {
      setIsDefined(true);
    });
  }, [maps3d]);

  useEffect(() => {
    if (isDefined && mapRef.current) {
      // Force direct property assignment to bypass any React DOM serialization bugs
      Object.assign(mapRef.current, {
        center: props.center,
        tilt: props.tilt,
        heading: props.heading,
        range: props.range,
      });
    }
  }, [isDefined, props]);

  if (!maps3d || !isDefined) {
    console.log("[Krashless Debug] Waiting for maps3d library and custom element to be defined...");
    return <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/50">Initializing 3D Spatial Engine...</div>;
  }

  console.log("[Krashless Debug] maps3d library loaded, rendering <gmp-map-3d> with props:", props);

  // @ts-ignore
  return <gmp-map-3d ref={mapRef} style={{ width: "100%", height: "100%", display: "block" }} mode="SATELLITE" className={props.className}>
    {props.children}
  </gmp-map-3d>;
}

export function GmpMap3D(props: {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string} version="alpha">
      <InnerMap3D {...props} />
    </APIProvider>
  );
}
