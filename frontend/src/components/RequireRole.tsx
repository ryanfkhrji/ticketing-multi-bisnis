"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types/api";

/**
 * Menyembunyikan halaman dari peran yang tidak berhak (hanya tampilan).
 * Backend tetap menolak dengan 403 kalau endpoint dipanggil langsung.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const allowed = user !== null && roles.includes(user.role);

  useEffect(() => {
    if (user && !allowed) router.replace("/tickets");
  }, [user, allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
