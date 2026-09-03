"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { identitiesApi } from "@/lib/api/identities";
import { QrDisplay } from "@/components/qr/qr-display";
import { toast } from "@/hooks/use-toast";
import { QrCode, Loader2, RefreshCw } from "lucide-react";

interface QrCodeCardProps {
  qrCode: string | null;
  onQrCodeGenerated: (code: string) => void;
}

export function QrCodeCard({ qrCode, onQrCodeGenerated }: QrCodeCardProps) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate(force = false) {
    setGenerating(true);
    try {
      const result = await identitiesApi.generateQrCode(force);
      onQrCodeGenerated(result.personalQrCode);
      toast({ title: "QR code généré" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de générer le QR code.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <h3 className="font-medium">QR Code personnel</h3>
        </div>
        {qrCode ? (
          <Button variant="ghost" size="sm" onClick={() => handleGenerate(true)} disabled={generating}>
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          </Button>
        ) : null}
      </div>

      {qrCode ? (
        <QrDisplay value={qrCode} size={180} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <QrCode className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">
            Générez votre QR code personnel pour le partager.
          </p>
          <Button onClick={() => handleGenerate()} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Générer mon QR code
          </Button>
        </div>
      )}
    </div>
  );
}
