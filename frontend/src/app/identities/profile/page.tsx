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
import { identitiesApi, type Profile } from "@/lib/api/identities";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, User, ShieldCheck, QrCode, FileText, PenLine, MapPin } from "lucide-react";
import Link from "next/link";

export default function IdentityProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profession, setProfession] = useState("");
  const [languages, setLanguages] = useState("");
  const [identityType, setIdentityType] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");

  useEffect(() => {
    identitiesApi
      .getProfile()
      .then((p) => {
        setProfile(p);
        populateForm(p);
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function populateForm(p: Profile) {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setGender(p.gender ?? "");
    setBirthDate(p.birthDate ? p.birthDate.slice(0, 10) : "");
    setProfession(p.profession ?? "");
    setLanguages(p.languages.join(", "));
    setIdentityType(p.identityDocumentType ?? "");
    setIdentityNumber(p.identityDocumentNumber ?? "");
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const p = await identitiesApi.createProfile({
        firstName,
        lastName,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        profession: profession || undefined,
        languages: languages ? languages.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        identityDocumentType: identityType || undefined,
        identityDocumentNumber: identityNumber || undefined,
      });
      setProfile(p);
      toast({ title: "Profil créé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer le profil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      const p = await identitiesApi.updateProfile({
        firstName,
        lastName,
        gender: gender || undefined,
        birthDate: birthDate || undefined,
        profession: profession || undefined,
        languages: languages ? languages.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        identityDocumentType: identityType || undefined,
        identityDocumentNumber: identityNumber || undefined,
      });
      setProfile(p);
      setEditing(false);
      toast({ title: "Profil mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
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
          {profile && (
            <VerifiedBadge
              verifiedAt={profile.verifiedAt}
              onVerified={() => setProfile({ ...profile, verifiedAt: new Date().toISOString() })}
            />
          )}
        </div>

        {!profile ? (
          <Card>
            <CardHeader>
              <CardTitle>Créer votre profil</CardTitle>
              <CardDescription>
                Complétez votre profil public pour que les autres utilisateurs puissent vous trouver.
              </CardDescription>
            </CardHeader>
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
                <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Médecin, commerçant, etc." />
              </div>
              <div className="space-y-2">
                <Label>Langues parlées</Label>
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="Français, Lingala, Swahili..." />
              </div>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer le profil
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
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
                    onAvatarChange={(url) => setProfile({ ...profile, avatarUrl: url })}
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Vérification d&apos;identité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pièce d&apos;identité
                  </Label>
                  <IdentityUpload
                    photoUrl={profile.identityDocumentPhoto}
                    onUpload={(url) => setProfile({ ...profile, identityDocumentPhoto: url })}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    Signature numérique
                  </Label>
                  <SignatureUpload
                    signatureUrl={profile.digitalSignature}
                    onUpload={(url) => setProfile({ ...profile, digitalSignature: url })}
                  />
                </div>
              </CardContent>
            </Card>

            <QrCodeCard
              qrCode={profile.personalQrCode}
              onQrCodeGenerated={(code) => setProfile({ ...profile, personalQrCode: code })}
            />
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
