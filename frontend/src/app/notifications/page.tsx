"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function fetchNotifications() {
    try {
      const data = await apiClient.get<{ data: Notification[]; meta: { unreadCount: number } }>("/notifications?limit=50");
      setNotifications(data.data);
      setUnreadCount(data.meta.unreadCount);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAsRead(id: string) {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast({ title: "Erreur", description: "Impossible de marquer comme lu", variant: "destructive" });
    }
  }

  async function markAllAsRead() {
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast({ title: "Succès", description: "Toutes les notifications marquées comme lues" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de marquer tout comme lu", variant: "destructive" });
    }
  }

  async function removeNotification(id: string) {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const removed = notifications.find((n) => n.id === id);
      if (removed && !removed.readAt) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <Bell className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">Aucune notification</p>
          <p className="text-sm text-zinc-500">Vous serez notifié lors des mises à jour importantes.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                !n.readAt ? "border-l-4 border-l-emerald-500" : ""
              }`}
              onClick={() => !n.readAt && markAsRead(n.id)}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${!n.readAt ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                    {n.title}
                  </span>
                  {!n.readAt && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                {n.body && <p className="text-sm text-zinc-600 dark:text-zinc-400">{n.body}</p>}
                <p className="text-xs text-zinc-400">
                  {new Date(n.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
