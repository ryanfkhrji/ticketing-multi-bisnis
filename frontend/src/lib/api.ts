import { useAuthStore } from "@/store/authStore";
import type { AccessTokenResponse, ApiErrorBody, FieldError, MeResponse, Message, RegisterBusinessInput, Ticket, TicketCreateInput, TicketStatus, TicketUpdateInput, TokenResponse, User, UserCreateInput } from "@/types/api";

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

/** Pesan yang aman ditampilkan ke user, termasuk detail validasi 422 kalau ada. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const detail = err.details?.[0]?.message;
    return detail ? `${err.message}: ${detail}` : err.message;
  }
  return fallback;
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

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server");
  }

  if (!res.ok) return false;
  const data = (await res.json()) as AccessTokenResponse;
  setTokens(data.access_token);
  return true;
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

// ---------- Auth ----------

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

// ---------- Users (Admin) ----------

export function listUsers(): Promise<User[]> {
  return apiFetch<User[]>("/users");
}

export function createUser(input: UserCreateInput): Promise<User> {
  return apiFetch<User>("/users", { method: "POST", body: input });
}

// ---------- Tickets ----------

export function listTickets(status?: TicketStatus): Promise<Ticket[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<Ticket[]>(`/tickets${query}`);
}

export function getTicket(id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`);
}

export function createTicket(input: TicketCreateInput): Promise<Ticket> {
  return apiFetch<Ticket>("/tickets", { method: "POST", body: input });
}

export function updateTicket(id: string, input: TicketUpdateInput): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`, { method: "PATCH", body: input });
}

export function listMessages(ticketId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/tickets/${ticketId}/messages`);
}
