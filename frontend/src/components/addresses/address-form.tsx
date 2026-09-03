"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { CreateAddressData, UpdateAddressData } from "@/lib/api/addresses";

interface AddressFormProps {
  defaultValues?: Partial<CreateAddressData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const ADDRESS_TYPES = [
  { value: "HOME", label: "Domicile" },
  { value: "BUSINESS", label: "Entreprise" },
  { value: "OFFICE", label: "Bureau" },
  { value: "SHOP", label: "Boutique" },
  { value: "SCHOOL", label: "École" },
  { value: "FARM", label: "Ferme" },
  { value: "ORGANIZATION", label: "Organisation" },
  { value: "EVENT", label: "Événement" },
  { value: "OTHER", label: "Autre" },
];

export function AddressForm({ defaultValues, onSubmit, onCancel, submitLabel = "Enregistrer" }: AddressFormProps) {
  const [label, setLabel] = useState(defaultValues?.label ?? "");
  const [type, setType] = useState(defaultValues?.type ?? "HOME");
  const [avenue, setAvenue] = useState(defaultValues?.avenue ?? "");
  const [quartier, setQuartier] = useState(defaultValues?.quartier ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [province, setProvince] = useState(defaultValues?.province ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(defaultValues?.longitude?.toString() ?? "");
  const [isPrimary, setIsPrimary] = useState(defaultValues?.isPrimary ?? false);
  const [isPublic, setIsPublic] = useState(defaultValues?.isPublic ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        label: label || undefined,
        type,
        avenue: avenue || undefined,
        quartier: quartier || undefined,
        city,
        province: province || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        isPrimary,
        isPublic,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Libellé</Label>
        <Input
          id="label"
          placeholder="Ex: Domicile, Bureau, Maison de Mamans..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {ADDRESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="avenue">Avenue / Rue</Label>
          <Input
            id="avenue"
            placeholder="Avenue de la Libération"
            value={avenue}
            onChange={(e) => setAvenue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quartier">Quartier</Label>
          <Input
            id="quartier"
            placeholder="Gombe"
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville *</Label>
          <Input
            id="city"
            placeholder="Kinshasa"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            placeholder="Kinshasa"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="-4.3219"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="15.3124"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Adresse principale
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Adresse publique
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
