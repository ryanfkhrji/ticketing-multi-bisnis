"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
        useAuthStore.getState().setProfile(me.user, me.business);
        if (!cancelled) setReady(true);
      } catch {
        useAuthStore.getState().logout();
        router.replace("/login");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
