"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { EMERGENCY_TYPES } from "@/lib/api/emergency";

interface ReportFormProps {
  onSubmit: (data: {
    type: string;
    description?: string;
    latitude: number;
    longitude: number;
    address?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function ReportForm({ onSubmit, onCancel }: ReportFormProps) {
  const [type, setType] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [saving, setSaving] = useState(false);

  function getLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => {}
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        type,
        description: description || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Type d&apos;urgence</Label>
        <div className="grid grid-cols-2 gap-2">
          {EMERGENCY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                type === t.value
                  ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              }`}
              onClick={() => setType(t.value)}
            >
              <span className="text-lg">{t.value === "POLICE" ? "🚔" : t.value === "FIRE" ? "🚒" : t.value === "MEDICAL" ? "🚑" : t.value === "ACCIDENT" ? "💥" : t.value === "NATURAL_DISASTER" ? "🌊" : "❓"}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" className="flex min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez la situation..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse / lieu</Label>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, avenue, point de repère..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <div className="flex gap-1">
            <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-4.4419" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="15.2663" />
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={getLocation} className="w-full">
        <MapPin className="h-4 w-4 mr-2" />
        Utiliser ma position
      </Button>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving || !latitude || !longitude} className="flex-1 bg-red-600 hover:bg-red-700">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Signaler l&apos;urgence
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
