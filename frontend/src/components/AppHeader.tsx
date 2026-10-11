"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

function navClass(active: boolean) {
  return cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }), "shrink-0 whitespace-nowrap", active && "font-semibold");
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const business = useAuthStore((state) => state.business);
  const logout = useAuthStore((state) => state.logout);

  const [logoutOpen, setLogoutOpen] = useState(false);

  const isTicketsActive = pathname === "/tickets" || (pathname.startsWith("/tickets/") && pathname !== "/tickets/new");
  const isNewTicketActive = pathname === "/tickets/new";
  const isUsersActive = pathname.startsWith("/admin/users");

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? "?";

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:py-4">
        {/* Nama bisnis */}
        <span className="order-1 max-w-[60vw] truncate font-semibold md:max-w-none">{business?.name ?? "Ticketing App"}</span>

        {/* Menu: baris kedua di HP, sebaris di desktop */}
        <nav className={cn("order-3 flex w-full items-center gap-1 overflow-x-auto", "md:order-2 md:w-auto md:overflow-visible")}>
          <Link href="/tickets" className={navClass(isTicketsActive)} aria-current={isTicketsActive ? "page" : undefined}>
            Tiket
          </Link>
          {user?.role === "customer" && (
            <Link href="/tickets/new" className={navClass(isNewTicketActive)} aria-current={isNewTicketActive ? "page" : undefined}>
              Buat tiket
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/users" className={navClass(isUsersActive)} aria-current={isUsersActive ? "page" : undefined}>
              Kelola user
            </Link>
          )}
        </nav>

        {/* Dropdown user */}
        {user && (
          <div className="order-2 ml-auto md:order-3">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="rounded-full" aria-label="Menu akun" />}>
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <div className="space-y-1 px-3 py-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setLogoutOpen(true)}>
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Dialog dirender di luar dropdown, dikontrol lewat state */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>Kamu harus login lagi untuk mengakses tiket.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Ya, keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}