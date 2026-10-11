"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PriorityBadge, StatusBadge } from "@/components/TicketBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { errorMessage, listUsers, updateTicket } from "@/lib/api";
import { canAssignTicket, canTakeTicket, getStatusActions } from "@/lib/ticket-actions";
import { formatDateTime } from "@/lib/ticket-ui";
import type { Ticket, TicketUpdateInput, User } from "@/types/api";

interface TicketInfoPanelProps {
  ticket: Ticket;
  user: User;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export function TicketInfoPanel({ ticket, user }: TicketInfoPanelProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const showAssign = canAssignTicket(ticket, user);
  const showTake = canTakeTicket(ticket, user);
  const statusActions = getStatusActions(ticket, user);

  // Daftar agen hanya diambil untuk Admin (endpoint /users khusus Admin)
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: showAssign,
  });
  const agents = (usersQuery.data ?? []).filter((item) => item.role === "agent");

  const mutation = useMutation({
    mutationFn: (input: TicketUpdateInput) => updateTicket(ticket.id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Ticket>(["ticket", ticket.id], updated);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Tiket diperbarui");
      setSelected(null);
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "Gagal memperbarui tiket"));
    },
  });

  const currentAgentId = ticket.assigned_agent?.id ?? "";
  const selectedAgentId = selected ?? currentAgentId;
  const hasActions = showAssign || showTake || statusActions.length > 0;

  function handleChange(value: string | null) {
    setSelected(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Info tiket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2">
          <InfoRow label="Status">
            <StatusBadge status={ticket.status} />
          </InfoRow>
          <InfoRow label="Prioritas">
            <PriorityBadge priority={ticket.priority} />
          </InfoRow>
          <InfoRow label="Kategori">{ticket.category}</InfoRow>
          <InfoRow label="Customer">{ticket.customer.name}</InfoRow>
          <InfoRow label="Ditangani oleh">{ticket.assigned_agent ? ticket.assigned_agent.name : "Belum diambil"}</InfoRow>
          <InfoRow label="Dibuat">{formatDateTime(ticket.created_at)}</InfoRow>
          <InfoRow label="Aktivitas terakhir">{formatDateTime(ticket.updated_at)}</InfoRow>
        </dl>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Aksi</h3>

          {showTake && (
            <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate({ assigned_agent_id: user.id })}>
              Ambil tiket
            </Button>
          )}

          {showAssign && (
            <div className="space-y-2">
              {usersQuery.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage(usersQuery.error, "Gagal memuat daftar agen")}
                </p>
              ) : agents.length === 0 && !usersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Belum ada agent di bisnis ini.</p>
              ) : (
                <>
                  <Select value={selectedAgentId} onValueChange={handleChange} items={agents.map((a) => ({ value: a.id, label: a.name }))}>
                    <SelectTrigger className={"w-full"}>
                      <SelectValue placeholder="Pilih agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="w-full" disabled={mutation.isPending || !selectedAgentId || selectedAgentId === currentAgentId} onClick={() => mutation.mutate({ assigned_agent_id: selectedAgentId })}>
                    {ticket.assigned_agent ? "Ganti agen" : "Assign agen"}
                  </Button>
                </>
              )}
            </div>
          )}

          {statusActions.map((action) => (
            <Button key={action.status + action.label} variant={action.primary ? "default" : "outline"} className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate({ status: action.status })}>
              {action.label}
            </Button>
          ))}

          {!hasActions && <p className="text-sm text-muted-foreground">{ticket.status === "closed" ? "Tiket sudah closed dan terkunci." : "Tidak ada aksi yang tersedia untuk Anda."}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
