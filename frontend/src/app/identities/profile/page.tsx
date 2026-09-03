"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { IdentityUpload } from "@/components/profile/identity-upload";
import { SignatureUpload } from "@/components/profile/signature-upload";
import { VerifiedBadge } from "@/components/profile/verified-badge";
import { QrCodeCard } from "@/components/profile/qr-code-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useProfileStore } from "@/stores/profile-store";
import type { Profile } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, User } from "lucide-react";
import Link from "next/link";

export default function IdentityProfilePage() {
  const profile = useProfileStore((s) => s.profile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const setPartial = useProfileStore((s) => s.setPartial);

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profession, setProfession] = useState("");
  const [languages, setLanguages] = useState("");
  const [secondaryPhones, setSecondaryPhones] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      populateForm(profile);
    }
  }, [profile]);

  function populateForm(p: Profile) {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setGender(p.gender ?? "");
    setBirthDate(p.birthDate ? p.birthDate.slice(0, 10) : "");
    setProfession(p.profession ?? "");
    setLanguages(p.languages.join(", "));
    setSecondaryPhones(p.secondaryPhones.join(", "));
    setIsPublic(p.isPublic);
    setIdentityType(p.identityDocumentType ?? "");
    setIdentityNumber(p.identityDocumentNumber ?? "");
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      await updateProfile({
        firstName,
        lastName,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        profession: profession || undefined,
        languages: languages ? languages.split(",").map((s) => s.trim()).filter(Boolean) : [],
        secondaryPhones: secondaryPhones
          ? secondaryPhones.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        isPublic,
        identityDocumentType: identityType || undefined,
        identityDocumentNumber: identityNumber || undefined,
      });
      setEditing(false);
      toast({ title: "Profil mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold">Profil public</h1>
          </div>
          <VerifiedBadge
            verifiedAt={profile.verifiedAt}
            hasIdentityDocument={Boolean(profile.identityDocumentPhoto)}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{firstName} {lastName}</CardTitle>
                <CardDescription>
                  {profession || "Aucune profession renseignée"}
                </CardDescription>
              </div>
              <AvatarUpload
                avatarUrl={profile.avatarUrl}
                name={`${firstName} ${lastName}`}
                onAvatarChange={(url) => setPartial({ avatarUrl: url })}
              />
            </div>
          </CardHeader>
          {editing ? (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Non précisé</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date de naissance</Label>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Profession</Label>
                <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Langues parlées</Label>
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Français, Lingala, Swahili..." />
              </div>
              <div className="space-y-2">
                <Label>Téléphones secondaires</Label>
                <Input value={secondaryPhones} onChange={(e) => setSecondaryPhones(e.target.value)} placeholder="+243 900 000 001, +243 900 000 002..." />
              </div>
              <div className="space-y-2">
                <Label>Pièce d&apos;identité</Label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={identityType}
                    onChange={(e) => setIdentityType(e.target.value)}
                  >
                    <option value="">Type</option>
                    <option value="NATIONAL_ID">Carte nationale</option>
                    <option value="PASSPORT">Passeport</option>
                    <option value="VOTER_CARD">Carte d&apos;électeur</option>
                    <option value="DRIVERS_LICENSE">Permis de conduire</option>
                  </select>
                  <Input value={identityNumber} onChange={(e) => setIdentityNumber(e.target.value)} placeholder="N° de pièce" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <Label htmlFor="isPublic">Profil visible publiquement</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleUpdate} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); populateForm(profile); }}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Genre</span>
                  <p>{profile.gender === "M" ? "Masculin" : profile.gender === "F" ? "Féminin" : "Non précisé"}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Date de naissance</span>
                  <p>{profile.birthDate ? new Date(profile.birthDate).toLocaleDateString("fr-FR") : "—"}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Langues</span>
                  <p>{profile.languages.length > 0 ? profile.languages.join(", ") : "—"}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Profil public</span>
                  <p>{profile.isPublic ? "Visible" : "Privé"}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Modifier le profil
                </Button>
                <Link href={`/u/${profile.userId}`}>
                  <Button variant="ghost">
                    Voir le profil public
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vérification d&apos;identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Pièce d&apos;identité</Label>
              <IdentityUpload
                photoUrl={profile.identityDocumentPhoto}
                onUpload={(url) => setPartial({ identityDocumentPhoto: url })}
              />
            </div>
            <div className="space-y-3">
              <Label>Signature numérique</Label>
              <SignatureUpload
                signatureUrl={profile.digitalSignature}
                onUpload={(url) => setPartial({ digitalSignature: url })}
              />
            </div>
          </CardContent>
        </Card>

        <QrCodeCard
          qrCode={profile.personalQrCode}
          onQrCodeGenerated={(code) => setPartial({ personalQrCode: code })}
        />
      </div>
    </ProtectedRoute>
  );
}