"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Download, Copy, Share2 } from "lucide-react";

interface QrDisplayProps {
  value: string;
  title?: string;
  size?: number;
  includeMargin?: boolean;
  level?: "L" | "M" | "Q" | "H";
}

export function QrDisplay({ value, title, size = 200, includeMargin = true, level = "M" }: QrDisplayProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `bantuexpress-qr-${Date.now()}.png`;
    a.click();
  }

  async function handleCopy() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        toast({ title: "QR code copié" });
      } catch {
        toast({ title: "Erreur", description: "Impossible de copier l'image.", variant: "destructive" });
      }
    });
  }

  async function handleShare() {
    if (!navigator.share) {
      toast({ title: "Partage non supporté", description: "Votre navigateur ne supporte pas le partage." });
      return;
    }
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.share({
          title: title ?? "BantuExpress QR Code",
          files: [new File([blob], "qrcode.png", { type: "image/png" })],
        });
      } catch {
        toast({ title: "Partage annulé" });
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h3 className="font-medium text-sm text-zinc-600 dark:text-zinc-400">{title}</h3>}
      <div ref={canvasRef} className="rounded-xl bg-white p-3 shadow-sm">
        <QRCodeCanvas value={value} size={size} includeMargin={includeMargin} level={level} />
      </div>
      <p className="text-xs text-zinc-500 break-all text-center max-w-full">{value}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Télécharger
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-1" />
          Copier
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Partager
          </Button>
        )}
      </div>
    </div>
  );
}
