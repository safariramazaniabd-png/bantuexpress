"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";

interface QrScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  async function startScanning() {
    setInitError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
          setScanning(false);
        },
        () => {}
      );
      setScanning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d'accéder à la caméra.";
      setInitError(msg);
      onError?.(msg);
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {!scanning ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Camera className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">Scannez un QR code BantuExpress</p>
          <Button onClick={startScanning} disabled={initError !== null}>
            <Camera className="h-4 w-4 mr-2" />
            Activer la caméra
          </Button>
          {initError && (
            <p className="text-sm text-red-500 text-center max-w-xs">{initError}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full">
          <div ref={containerRef} id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden" />
          <Button variant="outline" onClick={stopScanning}>
            <CameraOff className="h-4 w-4 mr-2" />
            Arrêter le scan
          </Button>
        </div>
      )}
    </div>
  );
}
