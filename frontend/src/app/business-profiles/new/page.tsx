"use client";

import { useRouter } from "next/navigation";
import { businessProfilesApi } from "@/lib/api/business-profiles";
import { BusinessForm } from "@/components/business/business-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { toast } from "@/hooks/use-toast";

export default function NewBusinessPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await businessProfilesApi.create(data as unknown as Parameters<typeof businessProfilesApi.create>[0]);
    toast({ title: "Profil professionnel créé" });
    router.push("/business-profiles");
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Nouveau profil</h1>
          <p className="text-sm text-zinc-500">Créez un profil entreprise, ONG ou administration</p>
        </div>
        <BusinessForm onSubmit={handleSubmit} submitLabel="Créer le profil" />
      </div>
    </ProtectedRoute>
  );
}
