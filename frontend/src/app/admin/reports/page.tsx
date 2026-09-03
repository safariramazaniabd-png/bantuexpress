"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type ContentReport } from "@/lib/api/admin";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900",
  REVIEWED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900",
  DISMISSED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  REVIEWED: "Traité",
  DISMISSED: "Rejeté",
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    adminApi.findAllReports({ status: filter ?? undefined, page, limit: 20 })
      .then((res) => { setReports(res.data); setTotalPages(Math.ceil(res.meta.total / res.meta.limit)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-sm text-zinc-500">Gestion des signalements</p>
        </div>

        <AdminSidebar />

        <div className="flex gap-2">
          {[null, "PENDING", "REVIEWED", "DISMISSED"].map((s) => (
            <Button key={s ?? "all"} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => { setFilter(s); setPage(1); }}>
              {s ? statusLabels[s] ?? s : "Tous"}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : reports.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-zinc-500">Aucun signalement.</CardContent></Card>
        ) : (
          <>
            <div className="space-y-2">
              {reports.map((r) => (
                <Card key={r.id} className="cursor-pointer transition hover:shadow-sm" onClick={() => router.push(`/admin/reports/${r.id}`)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Flag className="h-5 w-5 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{r.entityType} / {r.entityId.slice(0, 8)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] ?? ""}`}>
                          {statusLabels[r.status] ?? r.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {r.reason} • {r.reporter?.email ?? r.reporterId.slice(0, 8)} • {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Button>
                <span className="flex items-center text-sm text-zinc-500">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Suivant</Button>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
