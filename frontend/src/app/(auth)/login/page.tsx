"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  async function onSubmit(values: LoginForm) {
    setServerError(null);
    try {
      const tokens = await login(values.email, values.password);
      setTokens(tokens.access_token, tokens.refresh_token);
      router.replace("/tickets");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Masuk ke akun Ticketing Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email", { required: "Email wajib diisi" })} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" {...register("password", { required: "Password wajib diisi" })} />
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
              {isSubmitting ? "Memproses..." : "Masuk"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Belum punya bisnis?{" "}
              <Link href="/register" className="underline">
                Daftar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
