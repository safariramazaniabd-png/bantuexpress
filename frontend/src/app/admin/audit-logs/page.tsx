"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  admin: { id: string; email: string; role: string };
}

const ACTIONS = [
  "",
  "USER_ROLE_CHANGE",
  "USER_ACTIVATE",
  "USER_DEACTIVATE",
  "REPORT_REVIEW",
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter) params.set("action", actionFilter);
      const data = await apiClient.get<{ data: AuditLog[]; meta: { totalPages: number } }>(
        `/admin/audit-logs?${params}`,
      );
      setLogs(data.data);
      setTotalPages(data.meta.totalPages);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  function formatAction(action: string) {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 p-12 text-center">
          <History className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
            Aucune entrée dans le journal d&apos;audit
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{formatAction(log.action)}</p>
                <p className="text-xs text-zinc-500">
                  Par {log.admin.email} — {log.targetType ? `${log.targetType} #${log.targetId?.slice(0, 8)}` : "Système"}
                </p>
              </div>
              <p className="text-xs text-zinc-400">
                {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-zinc-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
