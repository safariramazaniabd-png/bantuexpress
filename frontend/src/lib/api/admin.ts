import { apiClient } from "@/lib/api-client";

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    profession: string | null;
  } | null;
  _count?: {
    addresses: number;
    landmarks: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface AdminStats {
  users: { total: number; byRole: Record<string, number> };
  deliveries: { total: number; byStatus: Record<string, number> };
  emergencies: { total: number; byStatus: Record<string, number> };
  businesses: { total: number; verified: number; unverified: number };
  landmarks: { total: number; verified: number; unverified: number };
  reports: { pending: number; reviewed: number; dismissed: number };
}

export interface ContentReport {
  id: string;
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: string;
  description: string | null;
  status: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; email: string };
  reviewedBy?: { id: string; email: string } | null;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin?: { id: string; email: string };
}

export const adminApi = {
  getStats: () => apiClient.get<AdminStats>("/admin/stats"),

  findAllUsers: (params?: { search?: string; role?: string; isActive?: boolean; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<AdminUser>>("/admin/users", params as Record<string, string>),

  findUser: (id: string) =>
    apiClient.get<AdminUser>(`/admin/users/${id}`),

  changeRole: (id: string, role: string) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/role`, { role }),

  toggleStatus: (id: string, isActive: boolean) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/status`, { isActive }),

  createReport: (data: { entityType: string; entityId: string; reason: string; description?: string }) =>
    apiClient.post<ContentReport>("/admin/reports", data),

  findAllReports: (params?: { status?: string; entityType?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<ContentReport>>("/admin/reports", params as Record<string, string>),

  findReport: (id: string) =>
    apiClient.get<ContentReport>(`/admin/reports/${id}`),

  reviewReport: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch<ContentReport>(`/admin/reports/${id}/review`, data),

  findAllAuditLogs: (params?: { action?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<AdminAuditLog>>("/admin/audit-logs", params as Record<string, string>),

  findAuditLog: (id: string) =>
    apiClient.get<AdminAuditLog>(`/admin/audit-logs/${id}`),
};
