import type { Message, Ticket, WsEvent } from "@/types/api";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "failed";

export interface TicketSocketOptions {
  /** Dibangun ulang setiap kali menyambung, karena token bisa berubah setelah refresh. */
  url: () => string | null;
  onEvent: (event: WsEvent) => void;
  onStatus: (status: SocketStatus) => void;
  /** Dipanggil saat koneksi pulih setelah sempat terputus (untuk mengambil data yang terlewat). */
  onReconnected: () => void;
  /** Dipanggil sebelum tiap percobaan sambung ulang (mis. memperbarui token yang habis). */
  beforeReconnect?: () => Promise<void>;
  maxRetries?: number;
  baseDelayMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessage(value: unknown): value is Message {
  return isRecord(value) && typeof value.id === "string" && typeof value.body === "string" && isRecord(value.sender);
}

function isTicket(value: unknown): value is Ticket {
  return isRecord(value) && typeof value.id === "string" && typeof value.status === "string";
}

/** Mengubah teks dari server menjadi event bertipe. Format yang tidak dikenal diabaikan. */
export function parseWsEvent(raw: string): WsEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || typeof data.type !== "string") return null;

  if (data.type === "message" && isMessage(data.data)) {
    return { type: "message", data: data.data };
  }
  if (data.type === "ticket_updated" && isTicket(data.data)) {
    return { type: "ticket_updated", data: data.data };
  }
  if (data.type === "error" && typeof data.detail === "string") {
    return { type: "error", detail: data.detail };
  }
  return null;
}

export class TicketSocket {
  private options: TicketSocketOptions;
  private socket: WebSocket | null = null;
  private retries = 0;
  private hasOpened = false;
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(options: TicketSocketOptions) {
    this.options = options;
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
  }

  connect(): void {
    if (this.disposed) return;

    const url = this.options.url();
    if (!url) {
      this.options.onStatus("failed");
      return;
    }
    if (this.retries === 0) this.options.onStatus("connecting");

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.retries = 0;
      this.options.onStatus("open");
      if (this.hasOpened) this.options.onReconnected();
      this.hasOpened = true;
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const parsed = parseWsEvent(event.data);
      if (parsed) this.options.onEvent(parsed);
    };

    // error dan close sama-sama berarti koneksi ini sudah tidak bisa dipakai.
    // (Handshake yang ditolak server memicu error, dan di sebagian lingkungan tanpa close.)
    socket.onerror = () => this.handleDrop(socket);
    socket.onclose = () => this.handleDrop(socket);
  }

  private handleDrop(socket: WebSocket): void {
    // Abaikan event dari koneksi lama atau event ganda (error lalu close)
    if (this.disposed || this.socket !== socket) return;
    this.socket = null;
    try {
      socket.close();
    } catch {
      // sudah tertutup
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.retries >= this.maxRetries) {
      this.options.onStatus("failed");
      return;
    }
    this.retries += 1;
    this.options.onStatus("reconnecting");

    const delay = Math.min(this.baseDelayMs * 2 ** (this.retries - 1), 8000);
    this.timer = setTimeout(async () => {
      this.timer = null;
      if (this.options.beforeReconnect) {
        try {
          await this.options.beforeReconnect();
        } catch {
          // Kegagalan sesi ditangani di tempat lain (arahkan ke /login)
        }
      }
      this.connect();
    }, delay);
  }

  /** Mengembalikan false kalau koneksi belum terbuka. */
  send(body: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ body }));
    return true;
  }

  close(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
}
