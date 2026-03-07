"use client";

import React, { useEffect, useState, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

export type MarkerConfig = {
  position: { lat: number; lng: number; altitude: number };
  label?: string;
};

type Maps3DLibrary = {
  Marker3DElement: new (options: {
    position: { lat: number; lng: number; altitude: number };
    altitudeMode: string;
    sizePreserved?: boolean;
  }) => HTMLElement;
  Marker3DInteractiveElement: new (options: {
    position: { lat: number; lng: number; altitude: number };
    altitudeMode: string;
  }) => HTMLElement;
};

type CameraTarget = {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
};

type GmpMap3DElement = HTMLElement & {
  center: CameraTarget["center"];
  tilt: number;
  heading: number;
  range: number;
  flyCameraTo?: (options: {
    endCamera: CameraTarget;
    durationMillis: number;
  }) => void;
};

function InnerMap3D(props: {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  heading: number;
  range: number;
  className?: string;
  marker?: MarkerConfig;
  onMarkerClick?: () => void;
  flyToMarkerOnClick?: boolean;
  flyToMarkerDurationMs?: number;
  flyToMarkerTilt?: number;
  flyToMarkerRange?: number;
  flyToMarkerHeading?: number;
  showMarkerDetails?: boolean;
}) {
  const maps3d = useMapsLibrary("maps3d");
  const [isDefined, setIsDefined] = useState(false);
  const mapRef = useRef<GmpMap3DElement | null>(null);
  const markerRef = useRef<HTMLElement | null>(null);
  const thumbnailMarkerRef = useRef<HTMLElement | null>(null);
  const labelMarkerRef = useRef<HTMLElement | null>(null);
  const hasFlownToMarkerRef = useRef(false);
  // Store callback in a ref so the event listener always sees the latest value
  const onMarkerClickRef = useRef(props.onMarkerClick);

  useEffect(() => {
    onMarkerClickRef.current = props.onMarkerClick;
  }, [props.onMarkerClick]);
  
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

    // Clean up any previously appended markers
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (thumbnailMarkerRef.current) {
      thumbnailMarkerRef.current.remove();
      thumbnailMarkerRef.current = null;
    }
    if (labelMarkerRef.current) {
      labelMarkerRef.current.remove();
      labelMarkerRef.current = null;
    }

    async function createMarker() {
      const maps3dLib = (await google.maps.importLibrary("maps3d")) as unknown as Maps3DLibrary;
      const Marker3DElement = maps3dLib.Marker3DElement;
      const Marker3DInteractiveElement = maps3dLib.Marker3DInteractiveElement;

      let thumbnailMarker: HTMLElement | null = null;
      let labelMarker: HTMLElement | null = null;

      if (props.showMarkerDetails) {
        thumbnailMarker = new Marker3DElement({
          position: { ...props.marker!.position, altitude: props.marker!.position.altitude + 25 },
          altitudeMode: "RELATIVE_TO_GROUND",
          sizePreserved: true,
        });

        labelMarker = new Marker3DElement({
          position: { ...props.marker!.position, altitude: props.marker!.position.altitude + 68 },
          altitudeMode: "RELATIVE_TO_GROUND",
          sizePreserved: true,
        });

        const thumbnail = document.createElement("img");
        thumbnail.alt = "Hotspot CCTV thumbnail";
        const sourceImage = new Image();
        sourceImage.src = "/mock-cctv.jpg";

        await new Promise<void>((resolve) => {
          sourceImage.onload = () => resolve();
          sourceImage.onerror = () => resolve();
        });

        const canvas = document.createElement("canvas");
        canvas.width = 144;
        canvas.height = 88;
        const context = canvas.getContext("2d");

        if (context) {
          context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
          thumbnail.src = canvas.toDataURL("image/jpeg", 0.84);
        } else {
          thumbnail.src = "/mock-cctv.jpg";
        }

        thumbnail.width = 144;
        thumbnail.height = 88;
        thumbnail.style.cssText = "display:block;width:72px;height:44px;object-fit:cover;border-radius:5px;border:1.5px solid rgba(255,255,255,0.95);background:#0f172a;";

        const thumbTemplate = document.createElement("template");
        thumbTemplate.content.append(thumbnail);
        thumbnailMarker.append(thumbTemplate);

        const locationLabel = props.marker?.label ?? "Hougang Ave 8 (Blk 535 Intersection)";
        const displayLabel =
          locationLabel.length > 34 ? `${locationLabel.slice(0, 31)}...` : locationLabel;

        const labelSvgNs = "http://www.w3.org/2000/svg";
        const labelSvg = document.createElementNS(labelSvgNs, "svg");
        labelSvg.setAttribute("width", "220");
        labelSvg.setAttribute("height", "34");
        labelSvg.setAttribute("viewBox", "0 0 220 34");

        const labelBg = document.createElementNS(labelSvgNs, "rect");
        labelBg.setAttribute("x", "0");
        labelBg.setAttribute("y", "0");
        labelBg.setAttribute("width", "220");
        labelBg.setAttribute("height", "34");
        labelBg.setAttribute("rx", "8");
        labelBg.setAttribute("fill", "rgba(2,6,23,0.88)");
        labelBg.setAttribute("stroke", "rgba(248,250,252,0.75)");
        labelBg.setAttribute("stroke-width", "1");
        labelSvg.appendChild(labelBg);

        const labelText = document.createElementNS(labelSvgNs, "text");
        labelText.setAttribute("x", "110");
        labelText.setAttribute("y", "22");
        labelText.setAttribute("text-anchor", "middle");
        labelText.setAttribute("fill", "#f8fafc");
        labelText.setAttribute("font-size", "12");
        labelText.setAttribute("font-family", "Arial, sans-serif");
        labelText.textContent = displayLabel;
        labelSvg.appendChild(labelText);

        const labelTemplate = document.createElement("template");
        labelTemplate.content.append(labelSvg);
        labelMarker.append(labelTemplate);
      }

      const marker = new Marker3DInteractiveElement({
        position: props.marker!.position,
        altitudeMode: "RELATIVE_TO_GROUND",
      });

      // Attach the gmp-click event — this is the official way per Google docs
      marker.addEventListener("gmp-click", () => {
        console.log("[Krashless] gmp-click fired on Marker3DInteractiveElement");
        if (!props.flyToMarkerOnClick || !mapRef.current || hasFlownToMarkerRef.current) {
          onMarkerClickRef.current?.();
          return;
        }

        const mapEl = mapRef.current;
        if (typeof mapEl.flyCameraTo !== "function") {
          onMarkerClickRef.current?.();
          return;
        }

        hasFlownToMarkerRef.current = true;
        mapEl.flyCameraTo({
          endCamera: {
            center: props.marker!.position,
            tilt: props.flyToMarkerTilt ?? 55,
            heading: props.flyToMarkerHeading ?? props.heading,
            range: props.flyToMarkerRange ?? 700,
          },
          durationMillis: props.flyToMarkerDurationMs ?? 2200,
        });

        mapEl.addEventListener(
          "gmp-animationend",
          () => {
            onMarkerClickRef.current?.();
          },
          { once: true },
        );
      });

      if (labelMarker) {
        mapRef.current!.append(labelMarker);
      }
      if (thumbnailMarker) {
        mapRef.current!.append(thumbnailMarker);
      }
      mapRef.current!.append(marker);
      labelMarkerRef.current = labelMarker;
      thumbnailMarkerRef.current = thumbnailMarker;
      markerRef.current = marker as unknown as HTMLElement;
    }

    createMarker();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (thumbnailMarkerRef.current) {
        thumbnailMarkerRef.current.remove();
        thumbnailMarkerRef.current = null;
      }
      if (labelMarkerRef.current) {
        labelMarkerRef.current.remove();
        labelMarkerRef.current = null;
      }
    };
  }, [
    isDefined,
    props.marker,
    props.flyToMarkerOnClick,
    props.flyToMarkerDurationMs,
    props.flyToMarkerTilt,
    props.flyToMarkerRange,
    props.flyToMarkerHeading,
    props.showMarkerDetails,
    props.heading,
  ]);

  if (!maps3d || !isDefined) {
    return <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/50">Initializing 3D Spatial Engine...</div>;
  }

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
  flyToMarkerOnClick?: boolean;
  flyToMarkerDurationMs?: number;
  flyToMarkerTilt?: number;
  flyToMarkerRange?: number;
  flyToMarkerHeading?: number;
  showMarkerDetails?: boolean;
}) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string} version="alpha">
      <InnerMap3D {...props} />
    </APIProvider>
  );
}
