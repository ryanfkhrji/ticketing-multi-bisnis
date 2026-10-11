"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTicket, errorMessage } from "@/lib/api";
import { PRIORITY_LABEL, TICKET_PRIORITIES, isTicketPriority } from "@/lib/ticket-ui";
import type { TicketPriority } from "@/types/api";

interface NewTicketForm {
  subject: string;
  category: string;
  priority: TicketPriority;
  message: string;
}

function NewTicketFormCard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<NewTicketForm>({
    defaultValues: { subject: "", category: "", priority: "medium", message: "" },
  });

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => {
      toast.success("Tiket berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      router.push(`/tickets/${ticket.id}`);
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "Gagal membuat tiket"));
    },
  });

  function onSubmit(values: NewTicketForm) {
    mutation.mutate({
      subject: values.subject.trim(),
      category: values.category.trim(),
      priority: values.priority,
      message: values.message.trim(),
    });
  }

  return (
    <Card className="mx-auto w-full">
      <CardHeader>
        <CardTitle>Buat tiket</CardTitle>
        <CardDescription>Jelaskan keluhan Anda. Pesan ini menjadi pesan pertama di ruang chat tiket.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="subject">Judul</Label>
            <Input
              id="subject"
              {...register("subject", {
                required: "Judul wajib diisi",
                minLength: { value: 3, message: "Minimal 3 karakter" },
                maxLength: { value: 200, message: "Maksimal 200 karakter" },
              })}
            />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Input
                id="category"
                placeholder="Contoh: Pembayaran"
                {...register("category", {
                  required: "Kategori wajib diisi",
                  minLength: { value: 2, message: "Minimal 2 karakter" },
                  maxLength: { value: 80, message: "Maksimal 80 karakter" },
                })}
              />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritas</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Pengecekan aman terhadap nilai null/undefined
                      if (value && isTicketPriority(value)) {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="Pilih prioritas" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {PRIORITY_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Pesan</Label>
            <Textarea
              id="message"
              rows={5}
              {...register("message", {
                validate: (value) => value.trim().length > 0 || "Pesan wajib diisi",
                maxLength: { value: 5000, message: "Maksimal 5000 karakter" },
              })}
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/tickets")}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Mengirim..." : "Kirim tiket"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewTicketPage() {
  return (
    <RequireRole roles={["customer"]}>
      <NewTicketFormCard />
    </RequireRole>
  );
}
