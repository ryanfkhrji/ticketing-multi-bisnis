"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, errorMessage, login, registerBusiness } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface RegisterForm {
  business_name: string;
  name: string;
  email: string;
  password: string;
}

const FORM_FIELDS: ReadonlyArray<keyof RegisterForm> = ["business_name", "name", "email", "password"];

function isFormField(field: string): field is keyof RegisterForm {
  return FORM_FIELDS.some((item) => item === field);
}

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  async function onSubmit(values: RegisterForm) {
    setServerError(null);
    try {
      await registerBusiness(values);
      // Setelah terdaftar, langsung masuk dengan akun admin yang baru dibuat
      const tokens = await login(values.email, values.password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.replace("/tickets");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { message: err.message });
        return;
      }
      if (err instanceof ApiError && err.details) {
        let matched = false;
        for (const detail of err.details) {
          if (isFormField(detail.field)) {
            setError(detail.field, { message: detail.message });
            matched = true;
          }
        }
        if (matched) return;
      }
      setServerError(errorMessage(err, "Terjadi kesalahan"));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Daftar bisnis baru</CardTitle>
          <CardDescription>Buat bisnis beserta akun admin untuk mengelola tiket dan tim Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="business_name">Nama bisnis</Label>
              <Input
                id="business_name"
                {...register("business_name", {
                  required: "Nama bisnis wajib diisi",
                  minLength: { value: 2, message: "Minimal 2 karakter" },
                  maxLength: { value: 150, message: "Maksimal 150 karakter" },
                })}
              />
              {errors.business_name && <p className="text-sm text-destructive">{errors.business_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama admin</Label>
              <Input
                id="name"
                autoComplete="name"
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
              <Input id="email" type="email" autoComplete="email" {...register("email", { required: "Email wajib diisi" })} />
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

            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full mt-3" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Daftar"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="underline">
                Masuk
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
