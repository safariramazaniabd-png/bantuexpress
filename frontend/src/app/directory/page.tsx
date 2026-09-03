"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, MapPin, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

const categories = [
  { id: "people", label: "Personnes", icon: Users, desc: "Trouvez des professionnels et particuliers", bg: "bg-emerald-100 dark:bg-emerald-900", iconColor: "text-emerald-600" },
  { id: "landmarks", label: "Points de repère", icon: Building2, desc: "Explorez les lieux remarquables", bg: "bg-amber-100 dark:bg-amber-900", iconColor: "text-amber-600" },
  { id: "addresses", label: "Adresses", icon: MapPin, desc: "Consultez les adresses publiques", bg: "bg-blue-100 dark:bg-blue-900", iconColor: "text-blue-600" },
];

const cities = ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kisangani", "Bukavu", "Goma", "Kananga", "Kolwezi"];

export default function DirectoryPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <div>
          <h1 className="text-2xl font-bold">Annuaire</h1>
          <p className="text-sm text-zinc-500">Parcourez les personnes, repères et adresses</p>
        </div>

        <div className="grid gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.id} className="cursor-pointer transition hover:shadow-sm"
                onClick={() => {
                  if (cat.id === "people") router.push("/search?type=people");
                  else if (cat.id === "landmarks") router.push("/search?type=landmarks");
                  else router.push("/search?type=addresses");
                }}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cat.bg}`}>
                    <Icon className={`h-6 w-6 ${cat.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{cat.label}</h3>
                    <p className="text-sm text-zinc-500">{cat.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="font-medium mb-3">Villes populaires</h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <Link key={city} href={`/search?q=${encodeURIComponent(city)}`}>
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
                  <MapPin className="h-3 w-3" />
                  {city}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Link href="/search">
            <span className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline">
              <Search className="h-4 w-4" />
              Recherche avancée
            </span>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
