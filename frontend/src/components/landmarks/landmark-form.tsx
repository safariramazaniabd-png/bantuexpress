"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { CATEGORIES } from "@/lib/api/landmarks";

interface LandmarkFormProps {
  defaultValues?: Partial<{
    name: string;
    category: string;
    description: string;
    address: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    isPublic: boolean;
  }>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function LandmarkForm({ defaultValues, onSubmit, onCancel, submitLabel = "Enregistrer" }: LandmarkFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? "OTHER");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [province, setProvince] = useState(defaultValues?.province ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(defaultValues?.longitude?.toString() ?? "");
  const [isPublic, setIsPublic] = useState(defaultValues?.isPublic ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        category,
        description: description || undefined,
        address: address || undefined,
        city,
        province: province || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isPublic,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Marché Central" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Catégorie</Label>
        <select id="category" className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={category} onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" className="flex min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du point de repère..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Avenue, quartier..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville *</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Kinshasa" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input id="province" value={province} onChange={(e) => setProvince(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude *</Label>
          <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude *</Label>
          <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-zinc-300" />
        Repère public
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
