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
import { PASSWORD_RULES, validatePassword, validatePasswordMatch, validatePhone } from "@/lib/validation";
import { MapPin, Loader2, Eye, EyeOff } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "individual", label: "Particulier" },
  { value: "entreprise", label: "Entreprise" },
  { value: "livreur", label: "Livreur" },
  { value: "transporteur", label: "Transporteur" },
  { value: "agence-livraison", label: "Agence de livraison" },
  { value: "ong", label: "ONG" },
];
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const hasInternationalPrefix = trimmed.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasInternationalPrefix) {
    if (!digits) return null;
    if (digits.startsWith("243")) {
      const subscriberNumber = digits.slice(3);
      if (subscriberNumber.length !== 9) return null;
      return `+243${subscriberNumber}`;
    }
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 9) {
    return `+243${digits.slice(1)}`;
  }

  if (digits.length === 9 && /^[89]/.test(digits)) {
    return `+243${digits}`;
  }

  return null;
}

function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = raw.replace(/\D/g, "");

  const groupByThree = (value: string) =>
    value.match(/.{1,3}/g)?.join(" ") ?? "";

  if (trimmed.startsWith("+")) {
    if (!digits) return raw;
    if (digits.startsWith("243")) {
      const subscriberNumber = digits.slice(3);
      return subscriberNumber ? `+243 ${groupByThree(subscriberNumber)}` : "+243";
    }
    return `+${groupByThree(digits)}`;
  }

  if (digits.startsWith("0") && digits.length === 9) {
    return groupByThree(digits).replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
  }

  if (digits.length <= 9) {
    return groupByThree(digits).replace(/^(\d{1,3})(\d{1,3})?(\d{1,3})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  }

  return raw;
}
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();
  const passwordCriteria = [
    { label: `Minimum ${PASSWORD_RULES.minLength} caractères`, met: form.password.length >= PASSWORD_RULES.minLength },
    { label: "Une minuscule", met: /[a-z]/.test(form.password) },
    { label: "Une majuscule", met: /[A-Z]/.test(form.password) },
    { label: "Un chiffre", met: /\d/.test(form.password) },
  ];

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalizedPhone = normalizePhone(form.phone);
    if (!normalizedPhone) {
      toast({
        title: "Erreur",
        description: "Entrez un numéro RDC valide (ex. +243 901 234 567) ou un numéro international commençant par +.",
        variant: "destructive",
      });
      return;
    }

    const phoneError = validatePhone(normalizedPhone);
    if (phoneError) {
      toast({ title: "Erreur", description: phoneError, variant: "destructive" });
      return;
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      toast({ title: "Erreur", description: passwordError, variant: "destructive" });
      return;
    }

    const passwordMatchError = validatePasswordMatch(form.password, form.confirmPassword);
    if (passwordMatchError) {
      toast({ title: "Erreur", description: passwordMatchError, variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
        await register({
          email: form.email,
          phone: normalizedPhone,
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
                placeholder="09X XXX XXX ou +243 9XX XXX XXX"
                value={form.phone}
                onChange={(e) => updateField("phone", formatPhone(e.target.value))}
                required
              />
              <p className="text-xs text-zinc-500">Format RDC : +243 9XX XXX XXX. Les numéros internationaux avec + sont aussi acceptés.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 caractères"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  minLength={PASSWORD_RULES.minLength}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <ul className="space-y-1 text-xs" aria-live="polite">
                {passwordCriteria.map((criterion) => (
                  <li key={criterion.label} className={criterion.met ? "text-emerald-600" : "text-zinc-500"}>
                    {criterion.met ? "Respecté" : "À respecter"} : {criterion.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Répétez le mot de passe"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  aria-label={showConfirmPassword ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {form.confirmPassword && (
                <p className={form.password === form.confirmPassword ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
                  {form.password === form.confirmPassword ? "Les mots de passe correspondent." : "Les mots de passe ne correspondent pas."}
                </p>
              )}
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
