import { apiClient } from "@/lib/api-client";

export type BusinessType = "ENTERPRISE" | "NGO" | "GOVERNMENT";

export interface BusinessProfile {
  id: string;
  userId: string;
  name: string;
  type: BusinessType;
  description: string | null;
  sector: string | null;
  logoUrl: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  province: string;
  country: string;
  isVerified: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfileDetail extends BusinessProfile {
  members?: BusinessMember[];
  products?: Product[];
  openingHours?: OpeningHour[];
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  joinedAt: string;
}

export interface Product {
  id: string;
  businessProfileId: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHour {
  id: string;
  businessProfileId: string;
  dayOfWeek: number;
  open: string;
  close: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateBusinessProfileData {
  name: string;
  type?: BusinessType;
  description?: string;
  sector?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  city: string;
  province?: string;
  country?: string;
  isPublic?: boolean;
}

export interface UpdateBusinessProfileData {
  name?: string;
  type?: BusinessType;
  description?: string;
  sector?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
  country?: string;
  isPublic?: boolean;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
}

export interface OpeningHourEntry {
  dayOfWeek: number;
  open: string;
  close: string;
}

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "ENTERPRISE", label: "Entreprise" },
  { value: "NGO", label: "ONG" },
  { value: "GOVERNMENT", label: "Administration" },
];

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const businessProfilesApi = {
  findAll: (params?: { type?: string; sector?: string; city?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<BusinessProfile>>("/business-profiles", params as Record<string, string>),

  findMine: () =>
    apiClient.get<BusinessProfile[]>("/business-profiles/mine"),

  findOne: (id: string) =>
    apiClient.get<BusinessProfileDetail>(`/business-profiles/${id}`),

  create: (data: CreateBusinessProfileData) =>
    apiClient.post<BusinessProfile>("/business-profiles", data),

  update: (id: string, data: UpdateBusinessProfileData) =>
    apiClient.patch<BusinessProfile>(`/business-profiles/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/business-profiles/${id}`),

  verify: (id: string) =>
    apiClient.patch<BusinessProfile>(`/business-profiles/${id}/verify`),

  getMembers: (id: string) =>
    apiClient.get<BusinessMember[]>(`/business-profiles/${id}/members`),

  addMember: (id: string, data: { userId: string; role?: string }) =>
    apiClient.post<BusinessMember>(`/business-profiles/${id}/members`, data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete<{ message: string }>(`/business-profiles/${id}/members/${userId}`),

  getProducts: (id: string) =>
    apiClient.get<Product[]>(`/business-profiles/${id}/products`),

  createProduct: (id: string, data: CreateProductData) =>
    apiClient.post<Product>(`/business-profiles/${id}/products`, data),

  updateProduct: (productId: string, data: UpdateProductData) =>
    apiClient.patch<Product>(`/business-profiles/products/${productId}`, data),

  removeProduct: (productId: string) =>
    apiClient.delete<{ message: string }>(`/business-profiles/products/${productId}`),

  getOpeningHours: (id: string) =>
    apiClient.get<OpeningHour[]>(`/business-profiles/${id}/opening-hours`),

  setOpeningHours: (id: string, data: { hours: OpeningHourEntry[] }) =>
    apiClient.put<OpeningHour[]>(`/business-profiles/${id}/opening-hours`, data),
};
