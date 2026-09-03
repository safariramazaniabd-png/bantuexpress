"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Copy } from "lucide-react";

export default function TwoFactorSetupPage() {
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "done">("loading");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const setup2fa = useAuthStore((s) => s.setup2fa);
  const verify2fa = useAuthStore((s) => s.verify2fa);

  useEffect(() => {
    setup2fa()
      .then((data) => {
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setStep("setup");
      })
      .catch(() => {
        toast({ title: "Erreur", description: "Impossible de configurer la 2FA.", variant: "destructive" });
        setStep("setup");
      });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await verify2fa(code);
      setStep("done");
      toast({ title: "2FA activée", description: "L'authentification à deux facteurs est maintenant active." });
    } catch {
      toast({ title: "Erreur", description: "Code invalide. Réessayez.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    toast({ title: "Copié", description: "Clé secrète copiée dans le presse-papier." });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle>Authentification à deux facteurs</CardTitle>
          <CardDescription>
            Renforcez la sécurité de votre compte avec la 2FA.
          </CardDescription>
        </CardHeader>

        {step === "loading" && (
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </CardContent>
        )}

        {step === "setup" && (
          <CardContent className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code 2FA" className="h-48 w-48" />
              </div>
            )}
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              <Label className="text-xs text-zinc-500">Clé secrète</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-sm">{secret}</code>
                <Button variant="ghost" size="icon" onClick={copySecret}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              Scannez le QR code avec Google Authenticator ou une application compatible,
              ou saisissez la clé secrète manuellement.
            </p>
            <Button className="w-full" onClick={() => setStep("verify")}>
              J&apos;ai scanné le code
            </Button>
          </CardContent>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">
                Saisissez le code à 6 chiffres généré par votre application d&apos;authentification.
              </p>
              <div className="space-y-2">
                <Label htmlFor="code">Code à 6 chiffres</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Vérifier et activer
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "done" && (
          <CardContent className="text-center py-8">
            <ShieldCheck className="mx-auto h-12 w-12 text-emerald-600" />
            <p className="mt-4 font-medium">2FA activée avec succès</p>
            <p className="mt-2 text-sm text-zinc-500">
              Votre compte est maintenant protégé par l&apos;authentification à deux facteurs.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
