"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminSidebar } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronRight } from "lucide-react";

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900",
  EMERGENCY: "bg-orange-100 text-orange-700 dark:bg-orange-900",
  PROFESSIONAL: "bg-blue-100 text-blue-700 dark:bg-blue-900",
  INDIVIDUAL: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800",
  COURIER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900",
  TRANSPORTER: "bg-violet-100 text-violet-700 dark:bg-violet-900",
  DELIVERY_AGENCY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    adminApi.findAllUsers({ search: search || undefined, page, limit: 20 })
      .then((res) => { setUsers(res.data); setTotal(res.meta.total); setTotalPages(Math.ceil(res.meta.total / res.meta.limit) || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-sm text-zinc-500">Gestion des utilisateurs</p>
        </div>

        <AdminSidebar />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par email ou téléphone..." className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <>
            <p className="text-sm text-zinc-500">{total} utilisateur{total > 1 ? "s" : ""}</p>
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="cursor-pointer transition hover:shadow-sm" onClick={() => router.push(`/admin/users/${u.id}`)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium dark:bg-zinc-800">
                      {u.profile ? `${u.profile.firstName[0]}${u.profile.lastName[0]}` : u.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[u.role] ?? ""}`}>
                          {u.role}
                        </span>
                        {!u.isActive && <span className="text-xs text-red-500">Désactivé</span>}
                      </div>
                      <p className="text-xs text-zinc-400">{u.email} • {u.phone}</p>
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
