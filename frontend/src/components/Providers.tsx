"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

    useEffect(() => {
      console.info("Built by Ryan");
    }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
