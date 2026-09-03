"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

export default function TwoFactorVerifyPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real flow, the email/password were already sent in the login step
      // and stored temporarily. For now, redirect to login which will handle 2fa flow.
      toast({ title: "Code requis", description: "Veuillez vous connecter avec vos identifiants et le code 2FA." });
      router.push("/login");
    } catch {
      toast({ title: "Erreur", description: "Code invalide.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle>Code 2FA requis</CardTitle>
          <CardDescription>
            Saisissez le code à 6 chiffres généré par votre application d&apos;authentification.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code d&apos;authentification</Label>
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
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Vérifier
            </Button>
            <Button
              variant="link"
              size="sm"
              className="text-zinc-500"
              onClick={() => router.push("/login")}
            >
              Retour à la connexion
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
