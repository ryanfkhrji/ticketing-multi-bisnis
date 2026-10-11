"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getMe } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Baca token dari localStorage dulu
      await useAuthStore.persist.rehydrate();
      const { accessToken, refreshToken } = useAuthStore.getState();

      if (!accessToken && !refreshToken) {
        router.replace("/login");
        return;
      }

      try {
        // getMe otomatis mencoba refresh kalau access token sudah habis
        const me = await getMe();
        if (cancelled) return;
        useAuthStore.getState().setProfile(me.user, me.business);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 0) {
          setOffline(true);
          return;
        }
        useAuthStore.getState().logout();
        router.replace("/login");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (offline) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-6">
        <p className="text-sm text-destructive">Tidak dapat terhubung ke server.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
