"use client";

import { useState, useEffect } from "react";
import { adminApi, type AdminStats } from "@/lib/api/admin";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, MapPin, Flag, Truck, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { title: "Utilisateurs", value: stats.users.total, icon: Users, sub: `${stats.users.byRole.INDIVIDUAL ?? 0} individuels`, iconClass: "text-blue-600" },
    { title: "Entreprises", value: stats.businesses.total, icon: Building2, sub: `${stats.businesses.verified} vérifiées`, iconClass: "text-violet-600" },
    { title: "Repères", value: stats.landmarks.total, icon: MapPin, sub: `${stats.landmarks.verified} vérifiés`, iconClass: "text-amber-600" },
    { title: "Livraisons", value: stats.deliveries.total, icon: Truck, sub: `${stats.deliveries.byStatus.DELIVERED ?? 0} livrées`, iconClass: "text-emerald-600" },
    { title: "Urgences", value: stats.emergencies.total, icon: AlertTriangle, sub: `${stats.emergencies.byStatus.REPORTED ?? 0} actives`, iconClass: "text-red-600" },
    { title: "Signalements", value: stats.reports.pending + stats.reports.reviewed + stats.reports.dismissed, icon: Flag, sub: `${stats.reports.pending} en attente`, iconClass: "text-orange-600" },
  ] : [];

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-sm text-zinc-500">Gestion de la plateforme</p>
        </div>

        <AdminSidebar />

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">{c.title}</span>
                      <Icon className={`h-4 w-4 ${c.iconClass}`} />
                    </div>
                    <p className="text-2xl font-bold">{c.value.toLocaleString()}</p>
                    <p className="text-xs text-zinc-400">{c.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
