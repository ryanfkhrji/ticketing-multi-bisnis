import type { ReactNode } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">{children}</main>
    </AuthGuard>
  );
}
