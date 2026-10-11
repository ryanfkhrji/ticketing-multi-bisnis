"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { SocketStatus } from "@/lib/ticket-socket";
import { ROLE_LABEL, formatDateTime } from "@/lib/ticket-ui";
import type { Message } from "@/types/api";

interface ChatPanelProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentUserId: string;
  socketStatus: SocketStatus;
  canSend: boolean;
  onSend: (body: string) => boolean;
}

interface ChatForm {
  body: string;
}

function ConnectionIndicator({ status }: { status: SocketStatus }) {
  if (status === "open") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-green-500" /> Terhubung
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-2 text-xs text-destructive">
        <span className="size-2 rounded-full bg-red-500" /> Terputus
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Muat ulang
        </Button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full bg-yellow-500" /> Menyambung...
    </span>
  );
}

export function ChatPanel({
  messages,
  isLoading,
  error,
  onRetry,
  currentUserId,
  socketStatus,
  canSend,
  onSend,
}: ChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;

  const { register, handleSubmit, reset } = useForm<ChatForm>({
    defaultValues: { body: "" },
  });

  // Gulir ke pesan terbaru setiap ada pesan baru
  useEffect(() => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [count]);

  const connected = socketStatus === "open";
  const inputDisabled = !canSend || !connected;

  function submit(values: ChatForm) {
    const body = values.body.trim();
    if (!body) return;
    if (onSend(body)) {
      reset();
    } else {
      toast.error("Belum terhubung ke chat. Coba lagi sebentar lagi.");
    }
  }

  // Enter = kirim, Shift+Enter = baris baru
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSubmit(submit)();
    }
  }

  const placeholder = !canSend
    ? "Tiket sudah closed, pesan baru tidak bisa dikirim"
    : connected
      ? "Tulis pesan... (Enter untuk kirim, Shift+Enter baris baru)"
      : "Menunggu koneksi...";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Percakapan</CardTitle>
        <ConnectionIndicator status={socketStatus} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={listRef}
          className="h-80 space-y-3 overflow-y-auto rounded-md border p-3 sm:h-96"
        >
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="ml-auto h-12 w-2/3" />
              <Skeleton className="h-12 w-1/2" />
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Coba lagi
              </Button>
            </div>
          )}

          {messages && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
          )}

          {messages?.map((message) => {
            const mine = message.sender.id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs opacity-80">
                    <span className="font-medium">{message.sender.name}</span>
                    <span>{ROLE_LABEL[message.sender.role]}</span>
                  </div>
                  <p className="whitespace-pre-wrap wrap-break-words">{message.body}</p>
                  <p className="mt-1 text-right text-[11px] opacity-70">
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(submit)} className="flex items-end gap-2">
          <Textarea
            rows={2}
            aria-label="Tulis pesan"
            placeholder={placeholder}
            disabled={inputDisabled}
            onKeyDown={handleKeyDown}
            {...register("body", { maxLength: 5000 })}
          />
          <Button type="submit" disabled={inputDisabled}>
            Kirim
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
