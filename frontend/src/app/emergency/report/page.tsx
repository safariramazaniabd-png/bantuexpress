"use client";

import { useRouter } from "next/navigation";
import { emergencyApi, type EmergencyType } from "@/lib/api/emergency";
import { ReportForm } from "@/components/emergency/report-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ReportEmergencyPage() {
  const router = useRouter();

  async function handleSubmit(data: { type: string; description?: string; latitude: number; longitude: number; address?: string }) {
    await emergencyApi.create({
      type: data.type as EmergencyType,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
    });
    toast({ title: "Urgence signalée", description: "Les services concernés ont été notifiés." });
    router.push("/emergency");
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Link href="/emergency">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-red-600">Signaler une urgence</h1>
            <p className="text-sm text-zinc-500">Remplissez le formulaire avec précision</p>
          </div>
        </div>

        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-4">
            <ReportForm onSubmit={handleSubmit} onCancel={() => router.push("/emergency")} />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
