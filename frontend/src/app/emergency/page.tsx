"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { emergencyApi, type Emergency, EMERGENCY_TYPES } from "@/lib/api/emergency";
import { EmergencyCard } from "@/components/emergency/emergency-card";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Plus, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function EmergencyPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emergencyApi.findMyReports({ limit: 5 }).then((res) => setReports(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const criticalContacts = EMERGENCY_TYPES.filter((t) => t.phone);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Urgences</h1>
            <p className="text-sm text-zinc-500">Signalez une urgence ou contactez les services</p>
          </div>
        </div>

        <Button onClick={() => router.push("/emergency/report")} className="w-full h-16 text-lg bg-red-600 hover:bg-red-700">
          <AlertTriangle className="h-6 w-6 mr-3 animate-pulse" />
          Signaler une urgence
        </Button>

        <Card>
          <CardHeader><CardTitle className="text-base">Contacts d&apos;urgence</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {criticalContacts.map((c) => (
              <a key={c.value} href={`tel:${c.phone}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-4 text-center transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Phone className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-xs font-medium">{c.label}</span>
                <span className="text-sm font-bold text-red-600">{c.phone}</span>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Mes signalements
              </CardTitle>
              <Link href="/emergency/reports">
                <Button variant="ghost" size="sm">
                  Voir tout <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : reports.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">Aucun signalement</p>
            ) : (
              reports.map((r) => (
                <EmergencyCard key={r.id} emergency={r} onClick={() => router.push(`/emergency/reports/${r.id}`)} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
