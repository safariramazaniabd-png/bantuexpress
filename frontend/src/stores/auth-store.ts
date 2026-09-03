import { create } from "zustand";
import { apiClient, ApiError } from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
}

export interface Session {
  id: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  temporaryToken: string | null;
  login: (emailOrPhone: string, password: string) => Promise<{ requires2fa?: boolean }>;
  register: (data: {
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    accountType?: string;
  }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithWhatsApp: (phone: string) => Promise<void>;
  verifyWhatsAppCode: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  verifyPhone: (code: string) => Promise<void>;
  setup2fa: () => Promise<TwoFactorSetup>;
  verify2fa: (token: string) => Promise<void>;
  loginWith2fa: (temporaryToken: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  resendCode: (target?: "email" | "phone") => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  fetchSessions: () => Promise<Session[]>;
  revokeSession: (id: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  temporaryToken: null,

  login: async (emailOrPhone, password) => {
    const data = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
      requires2fa?: boolean;
      temporaryToken?: string;
    }>("/auth/login", { emailOrPhone, password });

    if (data.requires2fa) {
      if (data.temporaryToken) {
        set({ temporaryToken: data.temporaryToken });
      }
      return { requires2fa: true };
    }

    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
    return {};
  },

  register: async (data) => {
    await apiClient.post("/auth/register", data);
  },

  loginWithGoogle: async (idToken) => {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/google",
      { idToken },
    );
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  loginWithApple: async (identityToken) => {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/apple",
      { identityToken },
    );
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  loginWithFacebook: async (accessToken) => {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/facebook",
      { accessToken },
    );
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  loginWithWhatsApp: async (phone) => {
    await apiClient.post("/auth/whatsapp/request", { phone });
  },

  verifyWhatsAppCode: async (phone, code) => {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/whatsapp/verify",
      { phone, code },
    );
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false, isLoading: false, temporaryToken: null });
  },

  fetchMe: async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await apiClient.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
      set({ isLoading: false });
    }
  },

  verifyEmail: async (code) => {
    await apiClient.post("/auth/verify-email", { code });
    if (useAuthStore.getState().user) {
      useAuthStore.getState().fetchMe();
    }
  },

  verifyPhone: async (code) => {
    await apiClient.post("/auth/verify-phone", { code });
    if (useAuthStore.getState().user) {
      useAuthStore.getState().fetchMe();
    }
  },

  setup2fa: async () => {
    const data = await apiClient.post<TwoFactorSetup>("/auth/2fa/enable");
    return data;
  },

  verify2fa: async (token) => {
    await apiClient.post("/auth/2fa/verify", { token });
  },

  loginWith2fa: async (temporaryToken, code) => {
    const data = await apiClient.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/login/2fa",
      { temporaryToken, code },
    );
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false, temporaryToken: null });
  },

  forgotPassword: async (email) => {
    await apiClient.post("/auth/forgot-password", { email });
  },

  resetPassword: async (token, newPassword) => {
    await apiClient.post("/auth/reset-password", { token, newPassword });
  },

  resendCode: async (target) => {
    await apiClient.post("/auth/resend-code", { target });
  },

  changePassword: async (currentPassword, newPassword) => {
    await apiClient.post("/auth/change-password", { currentPassword, newPassword });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false, temporaryToken: null });
  },

  setUser: (user) => set({ user, isAuthenticated: true }),

  fetchSessions: async () => {
    return apiClient.get<Session[]>("/auth/sessions");
  },

  revokeSession: async (id) => {
    await apiClient.delete(`/auth/sessions/${id}`);
  },

  revokeAllSessions: async () => {
    await apiClient.delete("/auth/sessions");
  },
}));
