"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ChatPanel } from "@/components/ChatPanel";
import { StatusBadge } from "@/components/TicketBadges";
import { TicketInfoPanel } from "@/components/TicketInfoPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicketSocket } from "@/hooks/useTicketSocket";
import { ApiError, errorMessage, getTicket, listMessages } from "@/lib/api";
import { canSendMessage } from "@/lib/ticket-actions";
import { useAuthStore } from "@/store/authStore";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const user = useAuthStore((state) => state.user);

  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId),
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", ticketId],
    queryFn: () => listMessages(ticketId),
  });

  // WebSocket hanya dibuka setelah tiket berhasil dimuat (artinya user berhak mengaksesnya)
  const { status: socketStatus, send } = useTicketSocket(ticketId, ticketQuery.isSuccess);

  const backLink = (
    <Link href="/tickets" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      ← Daftar tiket
    </Link>
  );

  const ticket = ticketQuery.data;

  // Data yang sudah ada selalu didahulukan. Layar error/loading hanya kalau belum ada data.
  if (!ticket || !user) {
    if (ticketQuery.isError) {
      const notFound =
        ticketQuery.error instanceof ApiError && ticketQuery.error.status === 404;
      return (
        <div className="space-y-4">
          {backLink}
          <Card>
            <CardContent className="space-y-3">
              <p role="alert" className="text-sm text-destructive">
                {notFound
                  ? "Tiket tidak ditemukan atau Anda tidak berhak mengaksesnya."
                  : errorMessage(ticketQuery.error, "Gagal memuat tiket")}
              </p>
              {!notFound && (
                <Button variant="outline" size="sm" onClick={() => ticketQuery.refetch()}>
                  Coba lagi
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {backLink}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Di HP, panel info tampil lebih dulu, lalu chat */}
        <div className="order-2 lg:order-1">
          <ChatPanel
            messages={messagesQuery.data}
            isLoading={messagesQuery.isLoading}
            error={
              messagesQuery.isError
                ? errorMessage(messagesQuery.error, "Gagal memuat pesan")
                : null
            }
            onRetry={() => messagesQuery.refetch()}
            currentUserId={user.id}
            socketStatus={socketStatus}
            canSend={canSendMessage(ticket)}
            onSend={send}
          />
        </div>
        <div className="order-1 lg:order-2">
          <TicketInfoPanel ticket={ticket} user={user} />
        </div>
      </div>
    </div>
  );
}
