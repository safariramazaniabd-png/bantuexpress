"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type ContentReport } from "@/lib/api/admin";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Flag, User, Clock } from "lucide-react";
import Link from "next/link";

export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<ContentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    adminApi.findReport(id).then(setReport).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function handleReview(status: string) {
    if (!report) return;
    setReviewing(true);
    try {
      const updated = await adminApi.reviewReport(id, { status });
      setReport(updated);
      toast({ title: `Signalement ${status === "REVIEWED" ? "traité" : "rejeté"}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de traiter le signalement.", variant: "destructive" });
    } finally {
      setReviewing(false);
    }
  }

  if (loading) return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl p-4 space-y-4"><Skeleton className="h-48 w-full" /></div>
    </ProtectedRoute>
  );

  if (!report) return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl p-4 text-center text-zinc-500">Signalement introuvable.</div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold">Signalement</h1>
            <p className="text-sm text-zinc-500">{report.entityType} / {report.entityId}</p>
          </div>
        </div>

        <AdminSidebar />

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-zinc-400" />
              <span className="text-sm font-medium">{report.reason}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                report.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                report.status === "REVIEWED" ? "bg-emerald-100 text-emerald-700" :
                "bg-zinc-100 text-zinc-500"
              }`}>
                {report.status === "PENDING" ? "En attente" : report.status === "REVIEWED" ? "Traité" : "Rejeté"}
              </span>
            </div>

            {report.description && (
              <div className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">{report.description}</div>
            )}

            <div className="text-xs text-zinc-400 space-y-1">
              <p className="flex items-center gap-1"><User className="h-3 w-3" />Signalé par {report.reporter?.email ?? report.reporterId}</p>
              <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(report.createdAt).toLocaleString("fr-FR")}</p>
              {report.reviewedBy && <p>Traité par {report.reviewedBy.email}</p>}
            </div>

            {report.status === "PENDING" && (
              <div className="flex gap-3 pt-2">
                <Button onClick={() => handleReview("REVIEWED")} disabled={reviewing}>Marquer comme traité</Button>
                <Button variant="outline" onClick={() => handleReview("DISMISSED")} disabled={reviewing}>Rejeter</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
