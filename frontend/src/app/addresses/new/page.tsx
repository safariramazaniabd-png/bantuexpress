"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AddressForm } from "@/components/addresses/address-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { addressesApi } from "@/lib/api/addresses";
import { toast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";

export default function NewAddressPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    try {
      await addressesApi.create(data as unknown as Parameters<typeof addressesApi.create>[0]);
      toast({ title: "Adresse créée" });
      router.push("/addresses");
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer l'adresse.", variant: "destructive" });
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <CardTitle>Nouvelle adresse</CardTitle>
            </div>
            <CardDescription>
              Ajoutez une adresse avec ses coordonnées pour la retrouver facilement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddressForm
              onSubmit={handleSubmit}
              onCancel={() => router.push("/addresses")}
              submitLabel="Créer l'adresse"
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
