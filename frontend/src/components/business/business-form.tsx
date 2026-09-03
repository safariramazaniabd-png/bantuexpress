"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/api/business-profiles";

interface BusinessFormProps {
  defaultValues?: Partial<{
    name: string;
    type: string;
    description: string;
    sector: string;
    logoUrl: string;
    website: string;
    email: string;
    phone: string;
    city: string;
    province: string;
    country: string;
    isPublic: boolean;
  }>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function BusinessForm({ defaultValues, onSubmit, onCancel, submitLabel = "Enregistrer" }: BusinessFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [type, setType] = useState(defaultValues?.type ?? "ENTERPRISE");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [sector, setSector] = useState(defaultValues?.sector ?? "");
  const [website, setWebsite] = useState(defaultValues?.website ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [province, setProvince] = useState(defaultValues?.province ?? "");
  const [isPublic, setIsPublic] = useState(defaultValues?.isPublic ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        type,
        description: description || undefined,
        sector: sector || undefined,
        website: website || undefined,
        email: email || undefined,
        phone: phone || undefined,
        city,
        province: province || undefined,
        country: "CD",
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
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nom de l'entreprise, ONG..." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select id="type" className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={type} onChange={(e) => setType(e.target.value)}
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" className="flex min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Présentation de l'organisation..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sector">Secteur</Label>
          <Input id="sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Technologie, Santé..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Site web</Label>
          <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </div>
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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-zinc-300" />
        Profil public
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
