"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { landmarksApi, type Landmark } from "@/lib/api/landmarks";
import { LandmarkCard } from "@/components/landmarks/landmark-card";
import { CategoryFilter } from "@/components/landmarks/category-filter";
import { DeleteDialog } from "@/components/addresses/delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function LandmarksPage() {
  const router = useRouter();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    landmarksApi.findAll({
      category: category ?? undefined,
      page,
      limit: 20,
    }).then((res) => {
      setLandmarks(res.data);
      setTotalPages(res.meta.totalPages);
    }).catch(() => {
      setError("Impossible de charger les points de repère.");
    }).finally(() => {
      setLoading(false);
    });
  }, [category, page]);

  async function handleDelete() {
    if (!deleteId) return;
    await landmarksApi.remove(deleteId);
    setDeleteId(null);
    setError(null);
    landmarksApi.findAll({
      category: category ?? undefined,
      page,
      limit: 20,
    }).then((res) => {
      setLandmarks(res.data);
      setTotalPages(res.meta.totalPages);
    }).catch(() => {
      setError("Impossible de charger les points de repère.");
    });
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Points de repère</h1>
            <p className="text-sm text-zinc-500">Ajoutez des repères pour mieux vous repérer</p>
          </div>
          <Button onClick={() => router.push("/landmarks/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau
          </Button>
        </div>

        <CategoryFilter selected={category} onChange={(c) => { setCategory(c); setPage(1); }} />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : error ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-zinc-500">{error}</p>
            <Button variant="outline" onClick={() => {
              setError(null);
              landmarksApi.findAll({
                category: category ?? undefined,
                page,
                limit: 20,
              }).then((res) => {
                setLandmarks(res.data);
                setTotalPages(res.meta.totalPages);
              }).catch(() => {
                setError("Impossible de charger les points de repère.");
              }).finally(() => {
                setLoading(false);
              });
            }}>Réessayer</Button>
          </CardContent></Card>
        ) : landmarks.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <MapPin className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">Aucun point de repère trouvé.</p>
            <Button onClick={() => router.push("/landmarks/new")}>Ajouter un repère</Button>
          </CardContent></Card>
        ) : (
          <>
            <div className="space-y-3">
              {landmarks.map((lm) => (
                <LandmarkCard
                  key={lm.id}
                  landmark={lm}
                  onEdit={(id) => router.push(`/landmarks/${id}/edit`)}
                  onDelete={setDeleteId}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Précédent
                </Button>
                <span className="flex items-center text-sm text-zinc-500">
                  Page {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}

        <DeleteDialog
          open={!!deleteId}
          onOpenChange={(o) => { if (!o) setDeleteId(null); }}
          onConfirm={handleDelete}
          title="Supprimer le repère"
          description="Ce point de repère sera définitivement supprimé."
        />
      </div>
    </ProtectedRoute>
  );
}

function MapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
  );
}
