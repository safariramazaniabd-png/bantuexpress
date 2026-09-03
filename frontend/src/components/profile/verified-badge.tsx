"use client";

import { CheckCircle2, Clock, FileQuestion } from "lucide-react";

interface VerifiedBadgeProps {
  verifiedAt: string | null;
  hasIdentityDocument: boolean;
}

export function VerifiedBadge({ verifiedAt, hasIdentityDocument }: VerifiedBadgeProps) {
  if (verifiedAt) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        Profil vérifié
        <span className="text-xs text-emerald-500">
          {new Date(verifiedAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
    );
  }

  if (hasIdentityDocument) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="h-4 w-4" />
        En attente de vérification
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <FileQuestion className="h-4 w-4" />
      Non vérifié
    </div>
  );
}