"use client";

import { MapPin, QrCode, Shield, Users } from "lucide-react";

const features = [
  { icon: MapPin, title: "Adresses intelligentes", desc: "Gérez vos adresses avec des points de repère et coordonnées GPS." },
  { icon: QrCode, title: "QR Codes", desc: "Partagez vos informations via un QR code personnel." },
  { icon: Shield, title: "Identité vérifiée", desc: "Profil sécurisé avec vérification d'identité et 2FA." },
  { icon: Users, title: "Réseau professionnel", desc: "Profils entreprise, livraison, services d'urgence." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">BantuExpress</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Votre adresse, votre identité, votre réseau
        </p>
        <p className="text-sm text-zinc-500">
          BantuExpress est une plateforme de géolocalisation et d&apos;identification numérique
          conçue pour la République Démocratique du Congo. Elle permet aux utilisateurs
          de créer une identité numérique, gérer leurs adresses avec des points de repère,
          et accéder à des services essentiels comme la livraison et les urgences.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="space-y-2 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            <f.icon className="h-8 w-8 text-emerald-600" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        Version 1.0.0 — Construit avec Next.js, NestJS, PostgreSQL + PostGIS
      </div>
    </div>
  );
}
