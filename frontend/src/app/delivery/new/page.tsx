"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { deliveriesApi, PACKAGE_SIZE_LABELS, type PackageSize } from "@/lib/api/delivery";
import { toast } from "@/hooks/use-toast";
import { Truck, Loader2, MapPin } from "lucide-react";

const PACKAGE_SIZES: { value: PackageSize; label: string }[] = [
  { value: "SMALL", label: PACKAGE_SIZE_LABELS.SMALL },
  { value: "MEDIUM", label: PACKAGE_SIZE_LABELS.MEDIUM },
  { value: "LARGE", label: PACKAGE_SIZE_LABELS.LARGE },
  { value: "EXTRA_LARGE", label: PACKAGE_SIZE_LABELS.EXTRA_LARGE },
];

export default function NewDeliveryPage() {
  const router = useRouter();

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [packageSize, setPackageSize] = useState<PackageSize>("MEDIUM");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!pickupAddress || !dropoffAddress) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les adresses de départ et de destination.",
        variant: "destructive",
      });
      return;
    }

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir les coordonnées GPS.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await deliveriesApi.create({
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropoffAddress,
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
        packageSize,
        description: description || undefined,
      });
      toast({ title: "Livraison créée", description: "Votre demande de livraison a été envoyée." });
      router.push("/delivery");
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de créer la livraison. Vérifiez les informations saisies.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <CardTitle>Nouvelle livraison</CardTitle>
            </div>
            <CardDescription>
              Saisissez les informations de votre livraison. Le prix sera calculé automatiquement
              en fonction de la distance et de la taille du colis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pickup section */}
              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Adresse de départ
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickupAddress">Adresse *</Label>
                    <Input
                      id="pickupAddress"
                      placeholder="123 Avenue de la Libération, Gombe"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickupLat">Latitude *</Label>
                      <Input
                        id="pickupLat"
                        type="number"
                        step="any"
                        placeholder="-4.3219"
                        value={pickupLat}
                        onChange={(e) => setPickupLat(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pickupLng">Longitude *</Label>
                      <Input
                        id="pickupLng"
                        type="number"
                        step="any"
                        placeholder="15.3124"
                        value={pickupLng}
                        onChange={(e) => setPickupLng(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropoff section */}
              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  Adresse de destination
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dropoffAddress">Adresse *</Label>
                    <Input
                      id="dropoffAddress"
                      placeholder="456 Avenue du Commerce, Centre"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dropoffLat">Latitude *</Label>
                      <Input
                        id="dropoffLat"
                        type="number"
                        step="any"
                        placeholder="-4.3310"
                        value={dropoffLat}
                        onChange={(e) => setDropoffLat(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dropoffLng">Longitude *</Label>
                      <Input
                        id="dropoffLng"
                        type="number"
                        step="any"
                        placeholder="15.3220"
                        value={dropoffLng}
                        onChange={(e) => setDropoffLng(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Package size */}
              <div className="space-y-2">
                <Label htmlFor="packageSize">Taille du colis</Label>
                <select
                  id="packageSize"
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={packageSize}
                  onChange={(e) => setPackageSize(e.target.value as PackageSize)}
                >
                  {PACKAGE_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnelle)</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
                  placeholder="Contenu du colis, instructions particulières..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Créer la livraison
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/delivery")}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
