"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Map, type MapMarker } from "@/components/map/map";
import { MapSearch } from "@/components/map/map-search";
import { landmarksApi } from "@/lib/api/landmarks";
import { addressesApi } from "@/lib/api/addresses";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, MapPin, Layers } from "lucide-react";

type LayerType = "all" | "landmarks" | "addresses";

export default function MapPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<LayerType>("all");
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [center, setCenter] = useState<[number, number]>([-4.4419, 15.2663]);

  async function fetchMarkers() {
    try {
      const promises: Promise<MapMarker[]>[] = [];

      if (layer === "all" || layer === "landmarks") {
        promises.push(
          landmarksApi.findAll({ limit: 200 }).then((res) =>
            res.data.map((lm) => ({
              id: `lm-${lm.id}`,
              lat: lm.latitude,
              lng: lm.longitude,
              label: lm.name,
              type: "landmark" as const,
              category: lm.category,
            }))
          ).catch(() => [])
        );
      }

      if (layer === "all" || layer === "addresses") {
        promises.push(
          addressesApi.findAll({ limit: 200 }).then((res) =>
            res.data.filter((a) => a.latitude != null && a.longitude != null).map((a) => ({
              id: `addr-${a.id}`,
              lat: a.latitude!,
              lng: a.longitude!,
              label: a.label ?? a.avenue ?? a.city,
              type: "address" as const,
            }))
          ).catch(() => [])
        );
      }

      const results = await Promise.all(promises);
      setMarkers(results.flat());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) fetchMarkers();
  }, [user, layer]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  function handleMarkerClick(marker: MapMarker) {
    setSelectedMarker(marker);
  }

  function handleSearchSelect(lat: number, lng: number, _label: string) {
    setCenter([lat, lng]);
    setSelectedMarker(null);
  }

  function handleGoToMe() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-[calc(100vh-57px)] flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <MapSearch onSelect={handleSearchSelect} />
          <div className="flex gap-1 shrink-0">
            <Button
              variant={layer === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setLayer("all")}
              className="h-9"
            >
              <Layers className="h-4 w-4 mr-1" />
              Tous
            </Button>
            <Button
              variant={layer === "landmarks" ? "default" : "outline"}
              size="sm"
              onClick={() => setLayer("landmarks")}
              className="h-9"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Repères
            </Button>
            <Button
              variant={layer === "addresses" ? "default" : "outline"}
              size="sm"
              onClick={() => setLayer("addresses")}
              className="h-9"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Adresses
            </Button>
            <Button variant="outline" size="sm" onClick={handleGoToMe} className="h-9">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative flex-1">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/50">
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          )}
          <Map
            center={center}
            zoom={13}
            markers={markers}
            onMarkerClick={handleMarkerClick}
            className="h-full w-full"
          />
        </div>

        {selectedMarker && (
          <div className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{selectedMarker.label}</h3>
                <p className="text-sm text-zinc-500">
                  {selectedMarker.type === "landmark" ? "Point de repère" : "Adresse"}
                  {selectedMarker.category ? ` — ${selectedMarker.category}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const base = selectedMarker.type === "landmark" ? "/landmarks" : "/addresses";
                  router.push(`${base}/${selectedMarker.id.replace(/^(lm|addr)-/, "")}/edit`);
                }}
              >
                Voir
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
