import { useAuthStore } from "@/store/authStore";
import type { AccessTokenResponse, ApiErrorBody, FieldError, MeResponse, RegisterBusinessInput, TokenResponse } from "@/types/api";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
export const WS_URL = API_URL.replace(/^http/, "ws");

export class ApiError extends Error {
  status: number;
  details?: FieldError[];

  constructor(status: number, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: boolean;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, data.error.message, data.error.details);
  } catch {
    return new ApiError(res.status, "Terjadi kesalahan pada server");
  }
}

// Satu proses refresh dipakai bersama kalau ada beberapa request yang 401 bersamaan.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AccessTokenResponse;
    setTokens(data.access_token);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function sessionExpired(): void {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = useAuthStore.getState().accessToken;
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "Tidak dapat terhubung ke server");
    }
  };

  let res = await send();

  if (res.status === 401 && auth) {
    if (await refreshOnce()) {
      res = await send();
    }
    if (res.status === 401) {
      sessionExpired();
    }
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function registerBusiness(input: RegisterBusinessInput): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/register-business", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}
