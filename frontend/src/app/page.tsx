import Link from "next/link";
import { MapPin, Search, Truck, Shield, Building2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MapPin,
    title: "Adresses & Repères",
    description: "Ajoutez et retrouvez vos adresses facilement avec des points de repère locaux.",
  },
  {
    icon: Search,
    title: "Annuaire & Recherche",
    description: "Trouvez des personnes, entreprises et services près de chez vous.",
  },
  {
    icon: Truck,
    title: "Livraison",
    description: "Commandez et suivez vos livraisons en temps réel.",
  },
  {
    icon: Shield,
    title: "Urgences",
    description: "Signalez et gérez les situations d'urgence rapidement.",
  },
  {
    icon: Building2,
    title: "Professionnels",
    description: "Créez votre profil professionnel et développez votre activité.",
  },
  {
    icon: QrCode,
    title: "QR Codes",
    description: "Partagez vos coordonnées et adresses via QR code.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Adresses, Livraison & Services
              <span className="text-emerald-600"> en RDC</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              BantuExpress vous aide à trouver des adresses, géolocaliser des points de repère,
              commander des livraisons et accéder aux services d&apos;urgence en République
              Démocratique du Congo.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">Commencer</Button>
              </Link>
              <Link href="/map">
                <Button variant="outline" size="lg">
                  Voir la carte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Une plateforme complète pour la vie quotidienne en RDC.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative rounded-xl border border-zinc-200 p-6 transition hover:border-emerald-200 hover:shadow-sm dark:border-zinc-800 dark:hover:border-emerald-800"
              >
                <feature.icon className="h-8 w-8 text-emerald-600" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
