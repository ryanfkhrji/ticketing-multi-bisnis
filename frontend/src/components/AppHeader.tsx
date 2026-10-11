"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

const navClass = buttonVariants({ variant: "ghost", size: "sm" });

export function AppHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const business = useAuthStore((state) => state.business);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className="font-semibold">{business?.name ?? "HelpDesk Mini"}</span>

        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/tickets" className={navClass}>
            Tiket
          </Link>
          {user?.role === "customer" && (
            <Link href="/tickets/new" className={navClass}>
              Buat tiket
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/users" className={navClass}>
              Kelola user
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">{user?.name}</span>
          {user && <Badge variant="secondary">{user.role}</Badge>}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}