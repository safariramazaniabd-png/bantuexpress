"use client";

import { useCallback, useState } from "react";
import { Map, type MapMarker } from "@/components/map/map";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const [lat, setLat] = useState(latitude?.toString() ?? "");
  const [lng, setLng] = useState(longitude?.toString() ?? "");

  const markers: MapMarker[] = lat && lng ? [{
    id: "picker",
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    label: "Position sélectionnée",
    type: "user",
  }] : [];

  const handleClick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
    onLocationChange(newLat, newLng);
  }, [onLocationChange]);

  const center: [number, number] = lat && lng
    ? [parseFloat(lat), parseFloat(lng)]
    : [-4.4419, 15.2663];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="picker-lat">Latitude</Label>
          <Input id="picker-lat" type="number" step="any" value={lat}
            onChange={(e) => {
              setLat(e.target.value);
              if (e.target.value && lng) onLocationChange(parseFloat(e.target.value), parseFloat(lng));
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="picker-lng">Longitude</Label>
          <Input id="picker-lng" type="number" step="any" value={lng}
            onChange={(e) => {
              setLng(e.target.value);
              if (lat && e.target.value) onLocationChange(parseFloat(lat), parseFloat(e.target.value));
            }}
          />
        </div>
      </div>
      <div className="h-64 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <Map center={center} zoom={15} markers={markers} onClick={handleClick} className="h-full w-full" />
      </div>
      <p className="text-xs text-zinc-500">Cliquez sur la carte pour définir la position</p>
    </div>
  );
}
