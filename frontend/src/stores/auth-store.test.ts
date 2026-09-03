import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { useAuthStore } from "./auth-store";
import { apiClient } from "@/lib/api-client";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  phone: "+243000000000",
  role: "INDIVIDUAL",
  isActive: true,
  emailVerified: true,
  phoneVerified: true,
};

const mockTokens = {
  accessToken: "access-token-123",
  refreshToken: "refresh-token-123",
};

describe("auth-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      temporaryToken: null,
    });
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should authenticate user on successful login", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      const result = await useAuthStore.getState().login("test@example.com", "password123");

      expect(result).toEqual({});
      expect(localStorage.getItem("accessToken")).toBe("access-token-123");
      expect(localStorage.getItem("refreshToken")).toBe("refresh-token-123");
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it("should return requires2fa when 2FA is enabled", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        requires2fa: true,
        temporaryToken: "temp-token-456",
      });

      const result = await useAuthStore.getState().login("test@example.com", "password123");

      expect(result).toEqual({ requires2fa: true });
      expect(useAuthStore.getState().temporaryToken).toBe("temp-token-456");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("Google login", () => {
    it("should authenticate with Google token", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      await useAuthStore.getState().loginWithGoogle("google-id-token");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/google", { idToken: "google-id-token" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe("Apple login", () => {
    it("should authenticate with Apple token", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      await useAuthStore.getState().loginWithApple("apple-identity-token");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/apple", { identityToken: "apple-identity-token" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe("Facebook login", () => {
    it("should authenticate with Facebook token", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      await useAuthStore.getState().loginWithFacebook("fb-access-token");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/facebook", { accessToken: "fb-access-token" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe("WhatsApp login", () => {
    it("should send verification code", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: "Code sent" });

      await useAuthStore.getState().loginWithWhatsApp("+243000000000");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/whatsapp/request", { phone: "+243000000000" });
    });

    it("should verify WhatsApp code and authenticate", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      await useAuthStore.getState().verifyWhatsAppCode("+243000000000", "123456");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/whatsapp/verify", { phone: "+243000000000", code: "123456" });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe("logout", () => {
    it("should clear user and tokens", () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        temporaryToken: "some-token",
      });
      localStorage.setItem("accessToken", "token");
      localStorage.setItem("refreshToken", "token");

      useAuthStore.getState().logout();

      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("2FA", () => {
    it("should setup 2FA and return secret", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        secret: "SECRET123",
        otpauth: "otpauth://totp/...",
      });

      const result = await useAuthStore.getState().setup2fa();

      expect(result).toEqual({ secret: "SECRET123", otpauth: "otpauth://totp/..." });
    });

    it("should verify 2FA token", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: "2FA enabled" });

      await useAuthStore.getState().verify2fa("123456");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/2fa/verify", { token: "123456" });
    });

    it("should complete login with 2FA", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ...mockTokens,
        user: mockUser,
      });

      await useAuthStore.getState().loginWith2fa("temp-token", "123456");

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().temporaryToken).toBeNull();
    });
  });

  describe("password management", () => {
    it("should call forgot-password API", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: "OK" });

      await useAuthStore.getState().forgotPassword("test@example.com");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/forgot-password", { email: "test@example.com" });
    });

    it("should call reset-password API", async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ message: "OK" });

      await useAuthStore.getState().resetPassword("reset-token", "newpassword123");

      expect(apiClient.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "reset-token",
        newPassword: "newpassword123",
      });
    });
  });
});
