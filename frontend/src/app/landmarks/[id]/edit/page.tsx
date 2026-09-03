"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { landmarksApi, type Landmark } from "@/lib/api/landmarks";
import { LandmarkForm } from "@/components/landmarks/landmark-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function EditLandmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    landmarksApi.findOne(id).then(setLandmark).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await landmarksApi.update(id, data as unknown as Parameters<typeof landmarksApi.update>[1]);
    toast({ title: "Point de repère mis à jour" });
    router.push("/landmarks");
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Modifier le repère</h1>
          <p className="text-sm text-zinc-500">Mettez à jour les informations</p>
        </div>

        {loading ? (
          <Card><CardContent className="p-4"><Skeleton className="h-80 w-full" /></CardContent></Card>
        ) : !landmark ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-zinc-500">Point de repère introuvable.</p>
          </CardContent></Card>
        ) : (
          <LandmarkForm
            defaultValues={{
              name: landmark.name,
              category: landmark.category,
              description: landmark.description ?? undefined,
              address: landmark.address ?? undefined,
              city: landmark.city,
              province: landmark.province,
              latitude: landmark.latitude,
              longitude: landmark.longitude,
              isPublic: landmark.isPublic,
            }}
            onSubmit={handleSubmit}
            submitLabel="Enregistrer"
            onCancel={() => router.push("/landmarks")}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
