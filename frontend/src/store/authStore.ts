import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Business, User } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  business: Business | null;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setProfile: (user: User, business: Business) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      business: null,
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),
      setProfile: (user, business) => set({ user, business }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, business: null }),
    }),
    {
      name: "ticketing-auth",
      // Hanya token yang disimpan di localStorage; profil selalu diambil dari /auth/me.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Dibaca manual di AuthGuard supaya tidak terjadi hydration mismatch di Next.js.
      skipHydration: true,
    },
  ),
);
