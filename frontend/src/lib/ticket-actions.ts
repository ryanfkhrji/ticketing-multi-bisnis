import type { Ticket, TicketStatus, User } from "@/types/api";

export interface StatusAction {
  label: string;
  status: TicketStatus;
  primary: boolean;
}

/**
 * Tombol perubahan status yang boleh tampil untuk user ini.
 * Aturan ini hanya untuk tampilan: backend tetap menolak (403/409) kalau dipanggil langsung.
 */
export function getStatusActions(ticket: Ticket, user: User): StatusAction[] {
  if (ticket.status === "closed") return [];

  if (user.role === "customer") {
    return ticket.status === "resolved" ? [{ label: "Buka kembali", status: "open", primary: true }] : [];
  }

  // Agent hanya boleh mengubah status tiket yang di-assign ke dirinya
  const isHolder = ticket.assigned_agent?.id === user.id;
  if (user.role === "agent" && !isHolder) return [];

  const actions: StatusAction[] = [];
  if (ticket.status === "open" && ticket.assigned_agent) {
    actions.push({ label: "Lanjutkan penanganan", status: "in_progress", primary: true });
  }
  if (ticket.status === "in_progress") {
    actions.push({ label: "Tandai selesai (resolved)", status: "resolved", primary: true });
  }
  if (ticket.status === "resolved") {
    actions.push({ label: "Tutup tiket", status: "closed", primary: true });
    // Membuka kembali = hak Customer, dan Admin sebagai override
    if (user.role === "admin") {
      actions.push({ label: "Buka kembali", status: "open", primary: false });
    }
  }
  return actions;
}

/** Agent boleh mengambil tiket yang masih open dan belum punya assignee. */
export function canTakeTicket(ticket: Ticket, user: User): boolean {
  return user.role === "agent" && ticket.status === "open" && ticket.assigned_agent === null;
}

/** Admin boleh meng-assign atau mengganti agen selama tiket belum closed. */
export function canAssignTicket(ticket: Ticket, user: User): boolean {
  return user.role === "admin" && ticket.status !== "closed";
}

/** Tiket closed tidak bisa menerima pesan baru. */
export function canSendMessage(ticket: Ticket): boolean {
  return ticket.status !== "closed";
}
