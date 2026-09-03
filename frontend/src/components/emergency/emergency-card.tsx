"use client";

import type { Emergency } from "@/lib/api/emergency";
import { EMERGENCY_TYPES, STATUS_LABELS } from "@/lib/api/emergency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, ArrowRight } from "lucide-react";

const severityColors: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900",
};

interface EmergencyCardProps {
  emergency: Emergency;
  onClick?: () => void;
  actions?: React.ReactNode;
}

export function EmergencyCard({ emergency, onClick, actions }: EmergencyCardProps) {
  const typeInfo = EMERGENCY_TYPES.find((t) => t.value === emergency.type);

  return (
    <Card className={`transition hover:shadow-sm ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              emergency.severity === "CRITICAL" ? "bg-red-100 dark:bg-red-900" :
              emergency.severity === "HIGH" ? "bg-orange-100 dark:bg-orange-900" :
              "bg-zinc-100 dark:bg-zinc-800"
            }`}>
              <span className={`text-lg font-bold ${
                emergency.severity === "CRITICAL" ? "text-red-600" :
                emergency.severity === "HIGH" ? "text-orange-600" :
                "text-zinc-600"
              }`}>!</span>
            </div>
            <div>
              <h3 className="font-medium">{typeInfo?.label ?? emergency.type}</h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className={`rounded-full px-2 py-0.5 ${severityColors[emergency.severity] ?? ""}`}>
                  {emergency.severity === "CRITICAL" ? "CRITIQUE" : emergency.severity === "HIGH" ? "HAUTE" : emergency.severity === "MEDIUM" ? "MOYENNE" : "BASSE"}
                </span>
                <span>{STATUS_LABELS[emergency.status] ?? emergency.status}</span>
              </div>
            </div>
          </div>
          {onClick && <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0 mt-1" />}
        </div>

        {emergency.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">{emergency.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{emergency.address ?? `${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(emergency.createdAt).toLocaleString("fr-FR")}</span>
        </div>

        {actions && <div className="flex gap-2 mt-3">{actions}</div>}
      </CardContent>
    </Card>
  );
}
