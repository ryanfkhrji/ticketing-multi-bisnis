"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { PriorityBadge, StatusBadge } from "@/components/TicketBadges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, listTickets } from "@/lib/api";
import { STATUS_LABEL, TICKET_STATUSES, formatDateTime, isTicketStatus } from "@/lib/ticket-ui";
import { useAuthStore } from "@/store/authStore";
import type { Ticket, TicketStatus } from "@/types/api";

const ALL = "all";
type StatusFilter = TicketStatus | typeof ALL;

function assigneeLabel(ticket: Ticket): string {
  return ticket.assigned_agent ? ticket.assigned_agent.name : "Belum diambil";
}

export default function TicketsPage() {
  const user = useAuthStore((state) => state.user);
  const isCustomer = user?.role === "customer";

  const [filter, setFilter] = useState<StatusFilter>(ALL);
  const status = filter === ALL ? undefined : filter;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["tickets", status ?? ALL],
    queryFn: () => listTickets(status),
  });

  function handleFilterChange(value: string | null) {
    if (value && isTicketStatus(value)) {
      setFilter(value);
    } else {
      setFilter(ALL);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Daftar tiket</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-40" aria-label="Filter status">
              <SelectValue>{filter === ALL ? "Semua status" : STATUS_LABEL[filter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua status</SelectItem>
              {TICKET_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {STATUS_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCustomer && (
            <Link href="/tickets/new" className={buttonVariants({ size: "sm" })}>
              Buat tiket
            </Link>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(error, "Gagal memuat tiket")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Memuat..." : "Coba lagi"}
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">{filter === ALL ? "Belum ada tiket." : `Tidak ada tiket dengan status ${STATUS_LABEL[filter]}.`}</p>
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <>
          {/* Tampilan tabel untuk layar lebar */}
          <div className="hidden border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiket</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Status</TableHead>
                  {!isCustomer && <TableHead>Customer</TableHead>}
                  <TableHead>Ditangani oleh</TableHead>
                  <TableHead>Aktivitas terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`} className="font-medium underline-offset-4 hover:underline">
                        {ticket.subject}
                      </Link>
                      <p className="text-xs text-muted-foreground">{ticket.category}</p>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    {!isCustomer && <TableCell>{ticket.customer.name}</TableCell>}
                    <TableCell>{assigneeLabel(ticket)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(ticket.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tampilan kartu untuk layar HP */}
          <div className="space-y-3 md:hidden">
            {data.map((ticket) => (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{ticket.subject}</p>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <span className="text-xs text-muted-foreground">{ticket.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {!isCustomer && `${ticket.customer.name} • `}
                      {assigneeLabel(ticket)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(ticket.updated_at)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
