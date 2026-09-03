"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, Session } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, LogOut } from "lucide-react";

export default function SessionsPage() {
  const fetchSessions = useAuthStore((s) => s.fetchSessions);
  const revokeSession = useAuthStore((s) => s.revokeSession);
  const revokeAllSessions = useAuthStore((s) => s.revokeAllSessions);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions()
      .then((data) => setSessions(data))
      .catch(() => {
        toast({ title: "Erreur", description: "Impossible de charger les sessions.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [fetchSessions]);

  async function handleRevoke(id: string) {
    setBusy(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Session révoquée", description: "Cette session a été fermée." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de révoquer la session.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRevokeAll() {
    setBusy("all");
    try {
      await revokeAllSessions();
      logout();
      router.push("/login");
    } catch {
      toast({ title: "Erreur", description: "Impossible de fermer toutes les sessions.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <CardDescription>
            Appareils connectés à votre compte. Révoquez une session pour la fermer immédiatement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Aucune session active.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">{s.userAgent || "Appareil inconnu"}</p>
                  <p className="text-xs text-zinc-500">
                    {s.ipAddress ? `IP ${s.ipAddress} · ` : ""}
                    Connecté le {formatDate(s.createdAt)} · Expire le {formatDate(s.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => handleRevoke(s.id)}
                >
                  {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Révoquer"}
                </Button>
              </div>
            ))
          )}

          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button
              variant="destructive"
              disabled={busy !== null || sessions.length === 0}
              onClick={handleRevokeAll}
              className="w-full"
            >
              {busy === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Fermer toutes les sessions
            </Button>
            <Button variant="ghost" onClick={() => router.push("/profile")} className="w-full">
              Retour au profil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
