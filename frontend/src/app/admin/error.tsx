"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-12 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h2 className="text-lg font-semibold">Erreur d&apos;administration</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Impossible de charger la page d&apos;administration.
      </p>
      <Button onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}
