import { apiClient } from "@/lib/api-client";

export interface Landmark {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  isPublic: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLandmarkData {
  name: string;
  category?: string;
  description?: string;
  address?: string;
  city: string;
  province?: string;
  country?: string;
  latitude: number;
  longitude: number;
  isPublic?: boolean;
}

export interface UpdateLandmarkData {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
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

export const CATEGORIES = [
  { value: "ROUTE", label: "Route" },
  { value: "NEIGHBORHOOD", label: "Quartier" },
  { value: "BUILDING", label: "Bâtiment" },
  { value: "MONUMENT", label: "Monument" },
  { value: "PARK", label: "Parc" },
  { value: "SCHOOL", label: "École" },
  { value: "HOSPITAL", label: "Hôpital" },
  { value: "MARKET", label: "Marché" },
  { value: "OTHER", label: "Autre" },
] as const;

export const landmarksApi = {
  findAll: (params?: { category?: string; city?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Landmark>>("/landmarks", params as Record<string, string>),

  findOne: (id: string) =>
    apiClient.get<Landmark>(`/landmarks/${id}`),

  create: (data: CreateLandmarkData) =>
    apiClient.post<Landmark>("/landmarks", data),

  update: (id: string, data: UpdateLandmarkData) =>
    apiClient.patch<Landmark>(`/landmarks/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/landmarks/${id}`),

  verify: (id: string) =>
    apiClient.patch<Landmark>(`/landmarks/${id}/verify`),
};
