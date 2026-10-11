"use client";

import { useAuthStore } from "@/store/authStore";

export default function TicketsPage() {
  const user = useAuthStore((state) => state.user);
  const business = useAuthStore((state) => state.business);

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Daftar tiket</h1>
      <p className="text-sm text-muted-foreground">
        Halo {user?.name} ({user?.role}) di {business?.name}. Halaman ini diisi besok.
      </p>
    </div>
  );
}
