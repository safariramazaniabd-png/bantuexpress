"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AddressCard } from "@/components/addresses/address-card";
import { DeleteDialog } from "@/components/addresses/delete-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi, type Address } from "@/lib/api/addresses";
import { toast } from "@/hooks/use-toast";
import { Plus, MapPin, Map } from "lucide-react";
import Link from "next/link";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    addressesApi.findAll().then((res) => {
      setAddresses(res.data);
    }).catch(() => {
      toast({ title: "Erreur", description: "Impossible de charger les adresses.", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    try {
      await addressesApi.remove(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Adresse supprimée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold">Mes adresses</h1>
          </div>
          <Link href="/addresses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle adresse
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <MapPin className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="font-medium">Aucune adresse</p>
              <p className="text-sm text-zinc-500 mt-1">
                Ajoutez votre première adresse pour commencer.
              </p>
            </div>
            <Link href="/addresses/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une adresse
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={(id) => router.push(`/addresses/${id}/edit`)}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Link href="/map">
            <Button variant="outline">
              <Map className="h-4 w-4 mr-2" />
              Voir sur la carte
            </Button>
          </Link>
        </div>

        <DeleteDialog
          open={!!deleteId}
          onOpenChange={(open) => { if (!open) setDeleteId(null); }}
          onConfirm={async () => {
            if (deleteId) await handleDelete(deleteId);
          }}
          title="Supprimer l'adresse"
          description="Cette adresse sera définitivement supprimée. Cette action est irréversible."
        />
      </div>
    </ProtectedRoute>
  );
}
