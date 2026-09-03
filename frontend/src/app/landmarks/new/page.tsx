"use client";

import { useRouter } from "next/navigation";
import { landmarksApi } from "@/lib/api/landmarks";
import { LandmarkForm } from "@/components/landmarks/landmark-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { toast } from "@/hooks/use-toast";

export default function NewLandmarkPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await landmarksApi.create(data as unknown as Parameters<typeof landmarksApi.create>[0]);
    toast({ title: "Point de repère créé" });
    router.push("/landmarks");
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Nouveau repère</h1>
          <p className="text-sm text-zinc-500">Ajoutez un lieu utile pour vous repérer</p>
        </div>
        <LandmarkForm onSubmit={handleSubmit} submitLabel="Créer le repère" />
      </div>
    </ProtectedRoute>
  );
}
