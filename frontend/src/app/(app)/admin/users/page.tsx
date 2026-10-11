"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { RequireRole } from "@/components/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createUser, errorMessage, listUsers } from "@/lib/api";
import { CREATABLE_ROLES, ROLE_LABEL, formatDateTime, isCreatableRole } from "@/lib/ticket-ui";
import type { CreatableRole } from "@/types/api";
import { useState } from "react";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: CreatableRole;
}

function CreateUserCard() {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    defaultValues: { name: "", email: "", password: "", role: "agent" },
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      toast.success(`Akun ${user.name} (${ROLE_LABEL[user.role]}) berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset();
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "Gagal membuat akun"));
    },
  });

  function onSubmit(values: UserForm) {
    mutation.mutate({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tambah user</CardTitle>
        <CardDescription>Buat akun Agent atau Customer untuk bisnis Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Nama wajib diisi",
                  minLength: { value: 2, message: "Minimal 2 karakter" },
                  maxLength: { value: 150, message: "Maksimal 150 karakter" },
                })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email", { required: "Email wajib diisi" })} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password", {
                  required: "Password wajib diisi",
                  minLength: { value: 8, message: "Minimal 8 karakter" },
                  maxLength: { value: 128, message: "Maksimal 128 karakter" },
                })}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}

              <div className="flex items-center">
                <input id="show-password" type="checkbox" className="mr-2" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                <label htmlFor="show-password">Tampilkan password</label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Peran</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Pengecekan aman terhadap nilai null/undefined
                      if (value && isCreatableRole(value)) {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATABLE_ROLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {ROLE_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Menyimpan..." : "Tambah user"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserListCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar user</CardTitle>
        <CardDescription>Semua akun di bisnis Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(error, "Gagal memuat daftar user")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Memuat..." : "Coba lagi"}
            </Button>
          </div>
        )}

        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Belum ada user.</p>}

        {data && data.length > 0 && (
          <ul className="divide-y">
            {data.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(user.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireRole roles={["admin"]}>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Kelola user</h1>
        <CreateUserCard />
        <UserListCard />
      </div>
    </RequireRole>
  );
}
