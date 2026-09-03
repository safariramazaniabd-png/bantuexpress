"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendCode = useAuthStore((s) => s.resendCode);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await verifyEmail(code);
      setDone(true);
      toast({ title: "Email vérifié", description: "Votre adresse email a été confirmée." });
      setTimeout(() => router.push("/"), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Code invalide";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <MailCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>Email vérifié</CardTitle>
            <CardDescription>Merci ! Votre adresse email est maintenant confirmée.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérifier votre email</CardTitle>
          <CardDescription>
            Saisissez le code de vérification envoyé à votre adresse email.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code de vérification</Label>
              <Input
                id="code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={async () => {
                  setResending(true);
                  try {
                    await resendCode("email");
                    toast({ title: "Code renvoyé", description: "Un nouveau code vous a été envoyé par email." });
                  } catch {
                    toast({ title: "Erreur", description: "Impossible de renvoyer le code", variant: "destructive" });
                  } finally {
                    setResending(false);
                  }
                }}
                disabled={resending}
                className="text-sm text-emerald-600 hover:underline disabled:opacity-50"
              >
                {resending ? "Envoi en cours..." : "Renvoyer le code"}
              </button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Vérifier
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
