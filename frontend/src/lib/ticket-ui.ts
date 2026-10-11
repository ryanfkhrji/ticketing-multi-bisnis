import type { CreatableRole, Role, TicketPriority, TicketStatus } from "@/types/api";

export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
export const TICKET_PRIORITIES: TicketPriority[] = ["low", "medium", "high"];
export const CREATABLE_ROLES: CreatableRole[] = ["agent", "customer"];

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  agent: "Agent",
  customer: "Customer",
};

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function isTicketPriority(value: string): value is TicketPriority {
  return TICKET_PRIORITIES.some((item) => item === value);
}

export function isCreatableRole(value: string): value is CreatableRole {
  return CREATABLE_ROLES.some((item) => item === value);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
