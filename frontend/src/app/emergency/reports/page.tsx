"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { emergencyApi, type Emergency } from "@/lib/api/emergency";
import { EmergencyCard } from "@/components/emergency/emergency-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function MyReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    emergencyApi.findMyReports({ page, limit: 20 }).then((res) => {
      setReports(res.data);
      setTotalPages(res.meta.totalPages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/emergency">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Mes signalements</h1>
              <p className="text-sm text-zinc-500">Historique de vos signalements d&apos;urgence</p>
            </div>
          </div>
          <Link href="/emergency/report">
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Nouveau
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : reports.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">Aucun signalement</p>
            <Link href="/emergency/report">
              <Button className="bg-red-600 hover:bg-red-700">Signaler une urgence</Button>
            </Link>
          </CardContent></Card>
        ) : (
          <>
            <div className="space-y-3">
              {reports.map((r) => (
                <EmergencyCard key={r.id} emergency={r} onClick={() => router.push(`/emergency/reports/${r.id}`)} />
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
