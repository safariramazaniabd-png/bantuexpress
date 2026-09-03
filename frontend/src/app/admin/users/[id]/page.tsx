"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, User, Mail, Phone, MapPin, Building2, Calendar } from "lucide-react";
import Link from "next/link";

const ROLES = ["INDIVIDUAL", "PROFESSIONAL", "ADMIN", "EMERGENCY", "COURIER", "TRANSPORTER", "DELIVERY_AGENCY"];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.findUser(id).then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function handleRoleChange(role: string) {
    try {
      await adminApi.changeRole(id, role);
      setUser((prev) => prev ? { ...prev, role } : prev);
      toast({ title: "Rôle mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de changer le rôle.", variant: "destructive" });
    }
  }

  async function handleToggleStatus() {
    if (!user) return;
    try {
      await adminApi.toggleStatus(id, !user.isActive);
      setUser({ ...user, isActive: !user.isActive });
      toast({ title: user.isActive ? "Utilisateur désactivé" : "Utilisateur activé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier le statut.", variant: "destructive" });
    }
  }

  if (loading) return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    </ProtectedRoute>
  );

  if (!user) return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl p-4 text-center text-zinc-500">Utilisateur introuvable.</div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Link href="/admin/users"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-xl font-bold">{user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email}</h1>
            <p className="text-sm text-zinc-500">Détails de l&apos;utilisateur</p>
          </div>
        </div>

        <AdminSidebar />

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Informations</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-400" />{user.email}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-400" />{user.phone}</p>
            <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-zinc-400" />Inscrit le {new Date(user.createdAt).toLocaleDateString("fr-FR")}</p>
            {user._count && (
              <div className="flex gap-4 text-xs text-zinc-500 pt-2">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{user._count.addresses} adresses</span>
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{user._count.landmarks} repères</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Rôle</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Button key={r} variant={user.role === r ? "default" : "outline"} size="sm" onClick={() => handleRoleChange(r)}>
                  {r}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Statut</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${user.isActive ? "text-emerald-600" : "text-red-600"}`}>
                {user.isActive ? "Actif" : "Désactivé"}
              </span>
              <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                {user.isActive ? "Désactiver" : "Activer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
