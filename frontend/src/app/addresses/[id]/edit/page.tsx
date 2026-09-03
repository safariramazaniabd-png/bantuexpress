"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AddressForm } from "@/components/addresses/address-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi, type Address } from "@/lib/api/addresses";
import { toast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

export default function EditAddressPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    addressesApi.findOne(id).then(setAddress).catch(() => {
      toast({ title: "Erreur", description: "Adresse introuvable.", variant: "destructive" });
      router.push("/addresses");
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    try {
      await addressesApi.update(id, data as unknown as Parameters<typeof addressesApi.update>[1]);
      toast({ title: "Adresse mise à jour" });
      router.push("/addresses");
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier.", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!address) return null;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <CardTitle>Modifier l&apos;adresse</CardTitle>
            </div>
            <CardDescription>
              {address.label || "Sans libellé"} — {address.city}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressForm
              defaultValues={{
                label: address.label ?? undefined,
                type: address.type,
                avenue: address.avenue ?? undefined,
                quartier: address.quartier ?? undefined,
                city: address.city,
                province: address.province,
                latitude: address.latitude ?? undefined,
                longitude: address.longitude ?? undefined,
                isPrimary: address.isPrimary,
                isPublic: address.isPublic,
              }}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/addresses")}
              submitLabel="Enregistrer"
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
