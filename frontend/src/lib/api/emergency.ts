import { apiClient } from "@/lib/api-client";

export type EmergencyType = "POLICE" | "FIRE" | "MEDICAL" | "ACCIDENT" | "NATURAL_DISASTER" | "OTHER";
export type EmergencySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EmergencyStatus = "REPORTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";

export interface Emergency {
  id: string;
  reporterId: string;
  responderId: string | null;
  type: EmergencyType;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  resolvedNotes: string | null;
  responseTimeMin: number | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateEmergencyData {
  type?: EmergencyType;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ResolveEmergencyData {
  resolvedNotes?: string;
}

export const EMERGENCY_TYPES: { value: EmergencyType; label: string; color: string; phone?: string }[] = [
  { value: "POLICE", label: "Police", color: "blue", phone: "112" },
  { value: "FIRE", label: "Pompiers", color: "red", phone: "118" },
  { value: "MEDICAL", label: "Ambulance", color: "emerald", phone: "119" },
  { value: "ACCIDENT", label: "Accident", color: "orange" },
  { value: "NATURAL_DISASTER", label: "Catastrophe naturelle", color: "yellow" },
  { value: "OTHER", label: "Autre", color: "zinc" },
];

export const STATUS_LABELS: Record<string, string> = {
  REPORTED: "Signalé",
  ASSIGNED: "Assigné",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CANCELLED: "Annulé",
};

export const emergencyApi = {
  create: (data: CreateEmergencyData) =>
    apiClient.post<Emergency>("/emergency/reports", data),

  findMyReports: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Emergency>>("/emergency/reports", params as Record<string, string>),

  findActive: (params?: { type?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Emergency>>("/emergency/reports/active", params as Record<string, string>),

  findOne: (id: string) =>
    apiClient.get<Emergency>(`/emergency/reports/${id}`),

  assign: (id: string) =>
    apiClient.patch<Emergency>(`/emergency/reports/${id}/assign`),

  startIntervention: (id: string) =>
    apiClient.patch<Emergency>(`/emergency/reports/${id}/start`),

  resolve: (id: string, data: ResolveEmergencyData) =>
    apiClient.patch<Emergency>(`/emergency/reports/${id}/resolve`, data),

  cancel: (id: string) =>
    apiClient.patch<Emergency>(`/emergency/reports/${id}/cancel`),
};
