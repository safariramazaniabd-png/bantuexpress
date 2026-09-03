"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  deliveriesApi,
  type Delivery,
  type DeliveryStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  PACKAGE_SIZE_LABELS,
} from "@/lib/api/delivery";
import { toast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    deliveriesApi
      .findAll({ role: "client" })
      .then((res) => {
        setDeliveries(res.data);
      })
      .catch(() => {
        toast({
          title: "Erreur",
          description: "Impossible de charger les livraisons.",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const activeStatuses: DeliveryStatus[] = [
    "PENDING",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
  ];
  const historyStatuses: DeliveryStatus[] = ["DELIVERED", "CANCELLED"];

  const filteredDeliveries = deliveries.filter((d) =>
    tab === "active"
      ? activeStatuses.includes(d.status)
      : historyStatuses.includes(d.status),
  );

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-bold">Mes livraisons</h1>
          </div>
          <Link href="/delivery/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle livraison
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setTab("active")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Clock className="inline h-4 w-4 mr-1.5" />
            En cours
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === "history"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Package className="inline h-4 w-4 mr-1.5" />
            Historique
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredDeliveries.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Truck className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="font-medium">
                {tab === "active"
                  ? "Aucune livraison en cours"
                  : "Aucun historique de livraison"}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {tab === "active"
                  ? "Créez votre première livraison pour commencer."
                  : "Vos livraisons terminées ou annulées apparaîtront ici."}
              </p>
            </div>
            {tab === "active" && (
              <Link href="/delivery/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle livraison
                </Button>
              </Link>
            )}
          </div>
        ) : (
          /* Delivery list */
          <div className="space-y-3">
            {filteredDeliveries.map((delivery) => (
              <Card
                key={delivery.id}
                className="cursor-pointer transition hover:shadow-sm"
                onClick={() => router.push(`/delivery/${delivery.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[delivery.status]
                        }`}
                      >
                        {STATUS_LABELS[delivery.status]}
                      </span>

                      {/* Pickup to Dropoff */}
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                          <span className="text-zinc-700 dark:text-zinc-300 truncate">
                            {delivery.pickupAddress}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                            <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                          </div>
                          <span className="text-zinc-700 dark:text-zinc-300 truncate">
                            {delivery.dropoffAddress}
                          </span>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                        <span>
                          {PACKAGE_SIZE_LABELS[delivery.packageSize]}
                        </span>
                        {delivery.distanceKm && (
                          <span>{delivery.distanceKm.toFixed(1)} km</span>
                        )}
                        {delivery.price && (
                          <span className="font-medium text-zinc-600 dark:text-zinc-400">
                            {Number(delivery.price).toFixed(2)} USD
                          </span>
                        )}
                        <span>
                          {new Date(delivery.createdAt).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="shrink-0 text-zinc-300 dark:text-zinc-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
