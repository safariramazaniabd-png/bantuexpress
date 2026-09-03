"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { identitiesApi, type Profile } from "@/lib/api/identities";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, ShieldCheck, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    identitiesApi
      .getPublicProfile(userId)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold text-zinc-300 dark:text-zinc-700">404</h1>
        <p className="mt-4 text-zinc-500">Ce profil n&apos;existe pas ou est privé.</p>
        <Link href="/" className="mt-6">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    );
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <Avatar className="mx-auto h-24 w-24 ring-4 ring-zinc-100 dark:ring-zinc-800">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={`${profile.firstName} ${profile.lastName}`} />
            ) : null}
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl dark:bg-emerald-900 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>

          <CardTitle className="mt-4 text-2xl">
            {profile.firstName} {profile.lastName}
          </CardTitle>

          {profile.verifiedAt && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Profil vérifié
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {profile.profession && (
            <div className="text-center">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                {profile.profession}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {profile.gender && (
              <div>
                <span className="text-zinc-500">Genre</span>
                <p className="font-medium">
                  {profile.gender === "M" ? "Masculin" : profile.gender === "F" ? "Féminin" : profile.gender}
                </p>
              </div>
            )}
            {profile.birthDate && (
              <div>
                <span className="text-zinc-500">Date de naissance</span>
                <p className="font-medium">
                  {new Date(profile.birthDate).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
            {profile.languages.length > 0 && (
              <div className="col-span-2">
                <span className="text-zinc-500">Langues</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.languages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {profile.personalQrCode && (
            <div className="flex flex-col items-center gap-2 pt-4">
              <QrCode className="h-5 w-5 text-zinc-400" />
              <p className="text-xs text-zinc-400 break-all text-center max-w-xs">
                {profile.personalQrCode}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
