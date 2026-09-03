"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { SocialButtons } from "@/components/auth/social-buttons";
import { MapPin, Loader2 } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "individual", label: "Particulier" },
  { value: "entreprise", label: "Entreprise" },
  { value: "livreur", label: "Livreur" },
  { value: "transporteur", label: "Transporteur" },
  { value: "agence-livraison", label: "Agence de livraison" },
  { value: "ong", label: "ONG" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    accountType: "individual",
  });
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      await register({
        email: form.email,
        phone: form.phone,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        accountType: form.accountType,
      });
      toast({ title: "Inscription réussie", description: "Vous pouvez maintenant vous connecter." });
      router.push("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec de l'inscription";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <MapPin className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle>Inscription</CardTitle>
          <CardDescription>Créez votre compte BantuExpress</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+243 XXX XXX XXX"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 caractères"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Répétez le mot de passe"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Type de compte</Label>
              <select
                id="accountType"
                value={form.accountType}
                onChange={(e) => updateField("accountType", e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
            <p className="text-sm text-zinc-500">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-emerald-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <SocialButtons />
        </div>
      </Card>
    </div>
  );
}
