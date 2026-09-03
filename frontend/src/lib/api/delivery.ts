import { apiClient } from "@/lib/api-client";

export interface Delivery {
  id: string;
  clientId: string;
  courierId: string | null;
  status: DeliveryStatus;
  packageSize: PackageSize;
  description: string | null;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number | null;
  price: number | string | null;
  proofPhoto: string | null;
  proofSignature: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: string };
  courier?: { id: string } | null;
  tracking?: DeliveryTracking[];
}

export interface DeliveryTracking {
  id: string;
  deliveryId: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type PackageSize = "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";

export interface CreateDeliveryData {
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  packageSize?: PackageSize;
  description?: string;
}

export interface DeliveryQuery {
  status?: DeliveryStatus;
  page?: number;
  limit?: number;
  role?: "client" | "courier";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "En attente",
  ASSIGNED: "Attribué",
  PICKED_UP: "Récupéré",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  CANCELLED: "Annulé",
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PICKED_UP: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  IN_TRANSIT: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const PACKAGE_SIZE_LABELS: Record<PackageSize, string> = {
  SMALL: "Petit",
  MEDIUM: "Moyen",
  LARGE: "Grand",
  EXTRA_LARGE: "Très grand",
};

export const deliveriesApi = {
  findAll: (params?: DeliveryQuery) =>
    apiClient.get<PaginatedResponse<Delivery>>(
      "/delivery/orders",
      params as Record<string, string>,
    ),

  findAvailable: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Delivery>>(
      "/delivery/orders/available",
      params as Record<string, string>,
    ),

  findOne: (id: string) => apiClient.get<Delivery>(`/delivery/orders/${id}`),

  create: (data: CreateDeliveryData) =>
    apiClient.post<Delivery>("/delivery/orders", data),

  cancel: (id: string) =>
    apiClient.patch<Delivery>(`/delivery/orders/${id}/cancel`),

  accept: (id: string) =>
    apiClient.patch<Delivery>(`/delivery/orders/${id}/accept`),

  markPickedUp: (id: string) =>
    apiClient.patch<Delivery>(`/delivery/orders/${id}/pickup`),

  markDelivered: (id: string) =>
    apiClient.patch<Delivery>(`/delivery/orders/${id}/deliver`),

  getTracking: (id: string) =>
    apiClient.get<DeliveryTracking[]>(`/delivery/orders/${id}/tracking`),

  addTrackingPoint: (
    id: string,
    data: { latitude: number; longitude: number },
  ) =>
    apiClient.post<DeliveryTracking>(
      `/delivery/orders/${id}/tracking`,
      data,
    ),
};
