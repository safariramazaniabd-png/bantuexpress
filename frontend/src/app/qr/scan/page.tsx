"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { QrScanner } from "@/components/qr/qr-scanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ScanPage() {
  const router = useRouter();
  const [scanned, setScanned] = useState<string | null>(null);

  function handleScan(data: string) {
    setScanned(data);
    toast({ title: "QR Code scanné", description: data.slice(0, 80) + (data.length > 80 ? "..." : "") });
  }

  function handleOpenUrl() {
    if (!scanned) return;
    try {
      const url = new URL(scanned);
      window.open(url.toString(), "_blank");
    } catch {
      router.push(scanned);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Link href="/qr">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Scanner</h1>
            <p className="text-sm text-zinc-500">Scannez un QR code BantuExpress</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <QrScanner onScan={handleScan} />
          </CardContent>
        </Card>

        {scanned && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-medium">Contenu scanné</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 break-all bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                {scanned}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(scanned).then(() => toast({ title: "Copié" }))}>
                  Copier
                </Button>
                {scanned.startsWith("http") && (
                  <Button size="sm" onClick={handleOpenUrl}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ouvrir
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
