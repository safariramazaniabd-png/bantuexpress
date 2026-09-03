"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { businessProfilesApi, type BusinessProfileDetail } from "@/lib/api/business-profiles";
import { BusinessForm } from "@/components/business/business-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessProfilesApi.findOne(id).then(setBusiness).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await businessProfilesApi.update(id, data as unknown as Parameters<typeof businessProfilesApi.update>[1]);
    toast({ title: "Profil mis à jour" });
    router.push("/business-profiles");
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Modifier le profil</h1>
          <p className="text-sm text-zinc-500">Mettez à jour les informations</p>
        </div>

        {loading ? (
          <Card><CardContent className="p-4"><Skeleton className="h-80 w-full" /></CardContent></Card>
        ) : !business ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-zinc-500">Profil introuvable.</p>
          </CardContent></Card>
        ) : (
          <BusinessForm
            defaultValues={{
              name: business.name,
              type: business.type,
              description: business.description ?? undefined,
              sector: business.sector ?? undefined,
              website: business.website ?? undefined,
              email: business.email ?? undefined,
              phone: business.phone ?? undefined,
              city: business.city,
              province: business.province,
              isPublic: business.isPublic,
            }}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer"
            onCancel={() => router.push("/business-profiles")}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
