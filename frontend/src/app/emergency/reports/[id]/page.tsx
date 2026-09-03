"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { emergencyApi, type Emergency, EMERGENCY_TYPES, STATUS_LABELS } from "@/lib/api/emergency";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, Phone } from "lucide-react";
import Link from "next/link";

export default function EmergencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emergencyApi.findOne(id).then(setEmergency).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <ProtectedRoute><div className="mx-auto max-w-lg p-4"><Skeleton className="h-64 w-full" /></div></ProtectedRoute>
  );

  if (!emergency) return (
    <ProtectedRoute><div className="mx-auto max-w-lg p-4 text-center text-zinc-500">Signalement introuvable.</div></ProtectedRoute>
  );

  const typeInfo = EMERGENCY_TYPES.find((t) => t.value === emergency.type);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Link href="/emergency/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{typeInfo?.label ?? emergency.type}</h1>
            <p className="text-sm text-zinc-500">Signalement du {new Date(emergency.createdAt).toLocaleString("fr-FR")}</p>
          </div>
        </div>

        <Card className={emergency.status === "REPORTED" ? "border-red-200 dark:border-red-900" : ""}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                emergency.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                emergency.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                "bg-zinc-100 text-zinc-600"
              }`}>
                {emergency.severity === "CRITICAL" ? "CRITIQUE" : emergency.severity === "HIGH" ? "HAUTE" : "STANDARD"}
              </span>
              <span className="text-sm font-medium">{STATUS_LABELS[emergency.status]}</span>
            </div>

            {emergency.description && (
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{emergency.description}</p>
              </div>
            )}

            <div className="text-sm text-zinc-500 space-y-2">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{emergency.address ?? `${emergency.latitude}, ${emergency.longitude}`}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4" />Signalé le {new Date(emergency.createdAt).toLocaleString("fr-FR")}</p>
              {emergency.responseTimeMin != null && <p className="flex items-center gap-2"><Clock className="h-4 w-4" />Temps de réponse : {emergency.responseTimeMin} min</p>}
            </div>

            {emergency.resolvedNotes && (
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 mb-1">Notes de résolution</p>
                <p className="text-sm">{emergency.resolvedNotes}</p>
              </div>
            )}

            {emergency.status === "REPORTED" && (
              <Button onClick={() => {
                emergencyApi.cancel(id).then(() => {
                  toast({ title: "Signalement annulé" });
                  router.push("/emergency/reports");
                }).catch(() => toast({ title: "Erreur", description: "Impossible d'annuler.", variant: "destructive" }));
              }} variant="outline" className="w-full text-red-600">Annuler le signalement</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
