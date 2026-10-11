export type Role = "admin" | "agent" | "customer";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export interface UserBrief {
  id: string;
  name: string;
  role: Role;
}

export interface User {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
}

export interface MeResponse {
  user: User;
  business: Business;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  customer: UserBrief;
  assigned_agent: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
  sender: UserBrief;
}

export interface RegisterBusinessInput {
  business_name: string;
  name: string;
  email: string;
  password: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    status: number;
    message: string;
    details?: FieldError[];
  };
}

// Event yang dikirim server lewat WebSocket
export type WsEvent =
  | { type: "message"; data: Message }
  | { type: "ticket_updated"; data: Ticket }
  | { type: "error"; detail: string };