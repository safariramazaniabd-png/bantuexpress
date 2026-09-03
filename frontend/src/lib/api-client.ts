const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000") + "/api/v1";
const CSRF_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(`${CSRF_BASE}/csrf-token`, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch {
    return null;
  }
}

export function resetCsrfToken(): void {
  csrfToken = null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refreshToken");
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!res.ok) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      return null;
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {},
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams}`;
  }

  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const method = (fetchOptions.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const token = await getCsrfToken();
    if (token) {
      headers["x-csrf-token"] = token;
    }
  }

  let res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });

  if (res.status === 401 && token) {
    const newToken = await refreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(". ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "Request failed";
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;

  return res
    .json()
    .then((data) => data as T)
    .catch(() => {
      throw new ApiError(res.status, "Réponse invalide du serveur");
    });
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string>) =>
    api<T>(path, { method: "GET", params }),

  post: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown) =>
    api<T>(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string) => api<T>(path, { method: "DELETE" }),
};
