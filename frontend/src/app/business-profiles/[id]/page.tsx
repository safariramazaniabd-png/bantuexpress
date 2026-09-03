"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { businessProfilesApi, type BusinessProfileDetail, DAYS } from "@/lib/api/business-profiles";
import { OpeningHoursForm } from "@/components/business/opening-hours-form";
import { ProductList } from "@/components/business/product-list";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, Globe, Mail, Phone, ShieldCheck, Clock, Package, Users, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  ENTERPRISE: "Entreprise",
  NGO: "ONG",
  GOVERNMENT: "Administration",
};

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessProfilesApi.findOne(id).then((data) => {
      setBusiness(data);
    }).catch(() => {
      setBusiness(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  async function handleSaveHours(hours: { dayOfWeek: number; open: string; close: string }[]) {
    await businessProfilesApi.setOpeningHours(id, { hours });
    toast({ title: "Horaires mis à jour" });
    businessProfilesApi.findOne(id).then((data) => {
      setBusiness(data);
    }).catch(() => {});
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl p-4 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!business) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl p-4 text-center text-zinc-500">
          Profil professionnel introuvable.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-violet-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{business.name}</h1>
                {business.isVerified && <ShieldCheck className="h-5 w-5 text-emerald-600" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                  {typeLabels[business.type] ?? business.type}
                </span>
                {business.sector && <span>{business.sector}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push(`/business-profiles/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>

        {business.description && (
          <Card>
            <CardHeader><CardTitle className="text-base">À propos</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-zinc-600 dark:text-zinc-400">{business.description}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {business.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-400" />{business.email}</p>}
            {business.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-400" />{business.phone}</p>}
            {business.website && <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-zinc-400" />{business.website}</p>}
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-400" />{business.city}, {business.province || business.country}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Horaires</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <OpeningHoursForm hours={business.openingHours} onSave={handleSaveHours} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Produits & Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductList businessId={id} products={business.products ?? []} onUpdate={() => {
              businessProfilesApi.findOne(id).then((data) => {
                setBusiness(data);
              }).catch(() => {});
            }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Membres</CardTitle>
          </CardHeader>
          <CardContent>
            {(business.members ?? []).length > 0 ? (
              <ul className="space-y-2 text-sm">
                {business.members?.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                    <span>{m.userId}</span>
                    <span className="text-xs text-zinc-500">{m.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">Aucun membre</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
