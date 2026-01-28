"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";

// Import Leaflet CSS - must be at top level for Next.js
import "leaflet/dist/leaflet.css";

interface VenueMapSelectorProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  error?: string;
  countryCenter?: { lat: number; lng: number };
  stateCenter?: { lat: number; lng: number };
}

// Component to handle map click events - must be inside MapContainer

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMapEvents } = require("react-leaflet");

  useMapEvents({
    click: (e: { latlng: { lat: number; lng: number } }) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export function VenueMapSelector({
  lat,
  lng,
  onLocationSelect,
  error,
  countryCenter,
  stateCenter,
}: VenueMapSelectorProps) {
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

  const handleMarkerDrag = (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
    const position = e.target.getLatLng();
    onLocationSelect(position.lat, position.lng);
  };

  // Priority: state center > country center > venue location > default
  const defaultCenter: [number, number] = stateCenter
    ? [stateCenter.lat, stateCenter.lng]
    : countryCenter
      ? [countryCenter.lat, countryCenter.lng]
      : [37.7749, -122.4194];
  const center: [number, number] = lat && lng ? [lat, lng] : defaultCenter;
  const zoom = lat && lng ? 15 : stateCenter ? 7 : countryCenter ? 6 : 3;

  if (!isMounted) {
    return (
      <div className="space-y-2">
        <Label>Location on Map</Label>
        <div className="relative">
          <div className="w-full h-[400px] rounded-md border border-input bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Location on Map</Label>
      <div className="relative z-0">
        <div className="w-full h-[400px] rounded-md border border-input overflow-hidden relative z-0">
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            key={`${stateCenter?.lat}-${stateCenter?.lng}-${countryCenter?.lat}-${countryCenter?.lng}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markerPosition && iconReady && (
              <Marker
                position={markerPosition}
                draggable={true}
                eventHandlers={{
                  dragend: handleMarkerDrag,
                }}
              >
                <Popup>Venue Location</Popup>
              </Marker>
            )}
            <MapClickHandler onLocationSelect={onLocationSelect} />
          </MapContainer>
        </div>
      </div>
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}. Click on the map or drag the marker to set location.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
