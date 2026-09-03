import { apiClient } from "@/lib/api-client";

export interface Address {
  id: string;
  userId: string;
  label: string | null;
  type: string;
  avenue: string | null;
  quartier: string | null;
  city: string;
  province: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  label?: string;
  type?: string;
  avenue?: string;
  quartier?: string;
  city: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  isPublic?: boolean;
}

export interface UpdateAddressData {
  label?: string;
  type?: string;
  avenue?: string;
  quartier?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
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

export const addressesApi = {
  findAll: (params?: { type?: string; isPublic?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Address>>("/addresses", params as Record<string, string>),

  findOne: (id: string) =>
    apiClient.get<Address>(`/addresses/${id}`),

  create: (data: CreateAddressData) =>
    apiClient.post<Address>("/addresses", data),

  update: (id: string, data: UpdateAddressData) =>
    apiClient.patch<Address>(`/addresses/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/addresses/${id}`),
};
