"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deliveriesApi,
  type Delivery,
  type DeliveryTracking,
  STATUS_LABELS,
  STATUS_COLORS,
  PACKAGE_SIZE_LABELS,
} from "@/lib/api/delivery";
import { toast } from "@/hooks/use-toast";
import {
  Truck,
  MapPin,
  ArrowRight,
  Package,
  Clock,
  DollarSign,
  Ruler,
  Loader2,
  ChevronLeft,
  XCircle,
  CheckCircle,
  Hand,
  PackageCheck,
} from "lucide-react";

const STATUS_ORDER: string[] = [
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

const TRACKING_LABELS: Record<string, string> = {
  PENDING: "Commande créée",
  ASSIGNED: "Livreur attribué",
  PICKED_UP: "Colis récupéré",
  IN_TRANSIT: "En cours de livraison",
  DELIVERED: "Livré",
  CANCELLED: "Annulé",
};

const TRACKING_ICONS: Record<string, typeof MapPin> = {
  PENDING: Package,
  ASSIGNED: Hand,
  PICKED_UP: PackageCheck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      deliveriesApi.findOne(id),
      deliveriesApi.getTracking(id),
    ])
      .then(([deliveryRes, trackingRes]) => {
        setDelivery(deliveryRes);
        setTracking(trackingRes);
      })
      .catch(() => {
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de la livraison.",
          variant: "destructive",
        });
        router.push("/delivery");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleAction(action: string) {
    if (!delivery) return;
    setActionLoading(action);
    try {
      let updated: Delivery | null = null;
      switch (action) {
        case "cancel":
          updated = await deliveriesApi.cancel(delivery.id);
          toast({ title: "Livraison annulée" });
          break;
        case "accept":
          updated = await deliveriesApi.accept(delivery.id);
          toast({ title: "Livraison acceptée" });
          break;
        case "pickup":
          updated = await deliveriesApi.markPickedUp(delivery.id);
          toast({ title: "Colis récupéré" });
          break;
        case "deliver":
          updated = await deliveriesApi.markDelivered(delivery.id);
          toast({ title: "Livraison terminée" });
          break;
      }
      if (updated) {
        setDelivery(updated);
        const trackingRes = await deliveriesApi.getTracking(delivery.id);
        setTracking(trackingRes);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Action impossible.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  function getTimeline(): string[] {
    if (!delivery) return [];
    if (delivery.status === "CANCELLED") {
      const idx = STATUS_ORDER.indexOf(delivery.status);
      return [...STATUS_ORDER.slice(0, idx), "CANCELLED"];
    }
    const idx = STATUS_ORDER.indexOf(delivery.status);
    return STATUS_ORDER.slice(0, idx + 1);
  }

  function getAvailableActions(): { key: string; label: string; variant: "default" | "destructive" | "outline" }[] {
    if (!delivery) return [];

    switch (delivery.status) {
      case "PENDING":
        return [
          { key: "cancel", label: "Annuler la livraison", variant: "destructive" },
        ];
      case "ASSIGNED":
        return [
          { key: "pickup", label: "Marquer comme récupéré", variant: "default" },
        ];
      case "PICKED_UP":
        return [
          { key: "deliver", label: "Marquer comme livré", variant: "default" },
        ];
      default:
        return [];
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!delivery) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-zinc-500">Livraison introuvable.</p>
        </div>
      </ProtectedRoute>
    );
  }

  const timeline = getTimeline();
  const actions = getAvailableActions();

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/delivery")}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux livraisons
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold">Détail de la livraison</h1>
              <p className="text-sm text-zinc-500">
                Créée le{" "}
                {new Date(delivery.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              STATUS_COLORS[delivery.status]
            }`}
          >
            {STATUS_LABELS[delivery.status]}
          </span>
        </div>

        {/* Addresses card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Départ
                </p>
                <p className="font-medium mt-0.5">{delivery.pickupAddress}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {delivery.pickupLat.toFixed(4)}, {delivery.pickupLng.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <MapPin className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  Destination
                </p>
                <p className="font-medium mt-0.5">{delivery.dropoffAddress}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {delivery.dropoffLat.toFixed(4)}, {delivery.dropoffLng.toFixed(4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails du colis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Package className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500 w-28">Taille</span>
              <span className="font-medium">
                {PACKAGE_SIZE_LABELS[delivery.packageSize]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Ruler className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500 w-28">Distance</span>
              <span className="font-medium">
                {delivery.distanceKm
                  ? `${delivery.distanceKm.toFixed(1)} km`
                  : "\u2014"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-500 w-28">Prix</span>
              <span className="font-medium">
                {delivery.price
                  ? `${Number(delivery.price).toFixed(2)} USD`
                  : "\u2014"}
              </span>
            </div>
            {delivery.description && (
              <div className="flex items-start gap-3 text-sm">
                <div className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-zinc-500 w-28">Description</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {delivery.description}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracking timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Suivi de la livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {timeline.map((status, index) => {
                const Icon = TRACKING_ICONS[status] ?? Package;
                const isActive = delivery.status === status;
                const isPast =
                  STATUS_ORDER.indexOf(status) <
                    STATUS_ORDER.indexOf(delivery.status) ||
                  status === "CANCELLED";
                const isLast = index === timeline.length - 1;

                return (
                  <div key={status} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isActive || isPast
                            ? "bg-emerald-100 dark:bg-emerald-900"
                            : "bg-zinc-100 dark:bg-zinc-800"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isActive || isPast
                              ? "text-emerald-600"
                              : "text-zinc-300 dark:text-zinc-600"
                          }`}
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-px flex-1 min-h-[24px] ${
                            isPast
                              ? "bg-emerald-200 dark:bg-emerald-800"
                              : "bg-zinc-200 dark:bg-zinc-700"
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-6">
                      <p
                        className={`text-sm font-medium ${
                          isActive || isPast
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {TRACKING_LABELS[status]}
                      </p>
                      {status === "CANCELLED" && delivery.cancelledReason && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {delivery.cancelledReason}
                        </p>
                      )}
                      {status === "DELIVERED" && delivery.deliveredAt && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(delivery.deliveredAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                      {status === "PICKED_UP" && delivery.pickedUpAt && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(delivery.pickedUpAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live tracking points */}
            {tracking.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
                  Points de suivi GPS ({tracking.length})
                </p>
                <div className="space-y-1.5">
                  {tracking.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center gap-2 text-xs text-zinc-500"
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                      </span>
                      <span>
                        {" \u2014 "}
                        {new Date(point.recordedAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant}
                disabled={actionLoading === action.key}
                onClick={() => handleAction(action.key)}
              >
                {actionLoading === action.key && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
