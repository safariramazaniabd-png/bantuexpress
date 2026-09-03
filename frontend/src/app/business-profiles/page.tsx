"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { businessProfilesApi, type BusinessProfile } from "@/lib/api/business-profiles";
import { BusinessCard } from "@/components/business/business-card";
import { DeleteDialog } from "@/components/addresses/delete-dialog";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, AlertCircle } from "lucide-react";

export default function BusinessProfilesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    businessProfilesApi.findMine().then((res) => {
      setBusinesses(res);
    }).catch(() => {
      setBusinesses([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    await businessProfilesApi.remove(deleteId);
    setDeleteId(null);
    businessProfilesApi.findMine().then((res) => {
      setBusinesses(res);
    }).catch(() => {
      setBusinesses([]);
    });
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profils professionnels</h1>
            <p className="text-sm text-zinc-500">Gérez vos entreprises, ONG et administrations</p>
          </div>
          <Button onClick={() => router.push("/business-profiles/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Building2 className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">Aucun profil professionnel.</p>
            <Button onClick={() => router.push("/business-profiles/new")}>Créer un profil</Button>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {businesses.map((b) => (
              <BusinessCard
                key={b.id}
                business={b}
                onClick={() => router.push(`/business-profiles/${b.id}`)}
                onEdit={(id) => router.push(`/business-profiles/${id}/edit`)}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}

        <DeleteDialog
          open={!!deleteId}
          onOpenChange={(o) => { if (!o) setDeleteId(null); }}
          onConfirm={handleDelete}
          title="Supprimer le profil"
          description="Ce profil professionnel sera supprimé."
        />
      </div>
    </ProtectedRoute>
  );
}
