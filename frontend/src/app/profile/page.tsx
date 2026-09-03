"use client";

import { useAuthStore } from "@/stores/auth-store";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, ShieldCheck, Smartphone, Mail, BadgeCheck } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user } = useAuthStore();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg dark:bg-emerald-900 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Mon profil</h1>
            <p className="text-sm text-zinc-500">
              {user?.role === "ADMIN" ? "Administrateur" : "Utilisateur"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations du compte
            </CardTitle>
            <CardDescription>Vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400" />
              <span>{user?.email}</span>
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-zinc-400" />
              <span>{user?.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-zinc-400" />
              <span>Rôle : {user?.role}</span>
            </div>
            <div className="pt-2">
              <Link href="/forgot-password" className="text-sm text-emerald-600 hover:underline">
                Changer le mot de passe
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/2fa/setup">
              <Button variant="outline" className="w-full justify-start">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Configurer l&apos;authentification à deux facteurs
              </Button>
            </Link>
            <Link href="/verify-email">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Vérifier mon email
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Identité numérique
            </CardTitle>
            <CardDescription>Complétez votre profil public.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/identities/profile">
              <Button variant="outline" className="w-full">
                Gérer mon profil public
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
