"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Import Leaflet CSS - must be at top level for Next.js
import "leaflet/dist/leaflet.css";

interface VenueMapDisplayProps {
  lat: number | null;
  lng: number | null;
  venueName?: string;
}

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function VenueMapDisplay({ lat, lng, venueName }: VenueMapDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [iconReady, setIconReady] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    setIsMounted(true);

    // Setup Leaflet icon after component mounts
    const setupIcon = async () => {
      if (typeof window === "undefined") return;

      try {
        const L = await import("leaflet");

        // Use CDN URLs for Leaflet icons (most reliable for Next.js)
        const DefaultIcon = L.default.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

        // Set as default icon for all markers
        L.default.Marker.prototype.options.icon = DefaultIcon;

        setIconReady(true);
      } catch (error) {
        console.error("Failed to setup Leaflet icon:", error);
        // Still allow map to render even if icon setup fails
        setIconReady(true);
      }
    };

    setupIcon();
  }, []);

  useEffect(() => {
    if (lat && lng) {
      setMarkerPosition([lat, lng]);
    } else {
      setMarkerPosition(null);
    }
  }, [lat, lng]);

  // Don't render until mounted (client-side only)
  if (!isMounted || !lat || !lng) {
    return (
      <div className="w-full h-48 rounded-md border border-input overflow-hidden bg-muted flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {!lat || !lng ? "No location coordinates available" : "Loading map..."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-48 rounded-md border border-input overflow-hidden relative z-0">
      <MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markerPosition && iconReady && (
          <Marker position={markerPosition}>
            <Popup>{venueName || "Venue Location"}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
