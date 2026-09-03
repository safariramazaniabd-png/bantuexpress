"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { QrDisplay } from "@/components/qr/qr-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, ScanLine, User, MapPin } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

type QrType = "profile" | "address" | "custom";

export default function QrPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<QrType>("profile");
  const [customData, setCustomData] = useState("");

  const profileUrl = user ? `${window.location.origin}/u/${user.id}` : "";
  const activeValue = activeTab === "profile" ? profileUrl : activeTab === "custom" ? customData : "";

  const tabs = [
    { id: "profile" as const, label: "Mon profil", icon: User },
    { id: "address" as const, label: "Adresse", icon: MapPin },
    { id: "custom" as const, label: "Personnalisé", icon: QrCode },
  ];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">QR Codes</h1>
            <p className="text-sm text-zinc-500">Générez, scannez et partagez vos QR codes</p>
          </div>
          <Link href="/qr/scan">
            <Button>
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
          </Link>
        </div>

        <div className="flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                  activeTab === t.id
                    ? "border-b-2 border-emerald-600 text-emerald-600"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-6">
            {activeTab === "profile" && (
              <div className="flex flex-col items-center gap-4">
                <QrDisplay
                  value={profileUrl}
                  title="QR Code de votre profil public"
                  size={220}
                />
                <Link href={`/u/${user?.id}`}>
                  <Button variant="link" className="text-sm">Voir le profil public →</Button>
                </Link>
              </div>
            )}

            {activeTab === "address" && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">Sélectionnez une adresse pour générer son QR code</p>
                <Link href="/addresses">
                  <Button variant="outline" className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    Voir mes adresses
                  </Button>
                </Link>
              </div>
            )}

            {activeTab === "custom" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-data">Texte ou URL</Label>
                  <Input id="custom-data" value={customData} onChange={(e) => setCustomData(e.target.value)} placeholder="Entrez un texte ou une URL..." />
                </div>
                {customData && (
                  <div className="flex justify-center pt-4">
                    <QrDisplay value={customData} title="QR Code personnalisé" size={200} level="H" />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-medium mb-3">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/qr/scan">
                <Button variant="outline" className="w-full">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scanner un QR
                </Button>
              </Link>
              <Link href="/identities/profile">
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Mon profil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
