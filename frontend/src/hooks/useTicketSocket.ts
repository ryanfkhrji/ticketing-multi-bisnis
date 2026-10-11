"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WS_URL, getMe } from "@/lib/api";
import { TicketSocket, type SocketStatus } from "@/lib/ticket-socket";
import { useAuthStore } from "@/store/authStore";
import type { Message, Ticket, WsEvent } from "@/types/api";

/**
 * Menyambungkan halaman tiket ke WebSocket dan menyinkronkan event dari server
 * ke cache React Query, sehingga pesan dan perubahan status muncul tanpa refresh.
 */
export function useTicketSocket(ticketId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const socketRef = useRef<TicketSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function handleEvent(event: WsEvent) {
      if (event.type === "message") {
        queryClient.setQueryData<Message[]>(["messages", ticketId], (old) => {
          if (!old) return [event.data];
          // Cegah pesan ganda kalau riwayat dari REST sudah memuatnya
          return old.some((item) => item.id === event.data.id)
            ? old
            : [...old, event.data];
        });
        // Pesan baru = aktivitas terbaru, urutan daftar tiket perlu diperbarui
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      } else if (event.type === "ticket_updated") {
        queryClient.setQueryData<Ticket>(["ticket", ticketId], event.data);
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      } else {
        toast.error(event.detail);
      }
    }

    const socket = new TicketSocket({
      url: () => {
        const token = useAuthStore.getState().accessToken;
        return token
          ? `${WS_URL}/ws/tickets/${ticketId}?token=${encodeURIComponent(token)}`
          : null;
      },
      onEvent: handleEvent,
      onStatus: setStatus,
      onReconnected: () => {
        queryClient.invalidateQueries({ queryKey: ["messages", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      },
      // Panggilan REST ini memperbarui access token otomatis kalau sudah habis
      beforeReconnect: async () => {
        await getMe();
      },
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [ticketId, enabled, queryClient]);

  const send = useCallback((body: string): boolean => {
    return socketRef.current?.send(body) ?? false;
  }, []);

  return { status, send };
}
