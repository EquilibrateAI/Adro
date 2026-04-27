"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";

// Bump this version string every release to force a clean localStorage wipe
const APP_VERSION = "0.1.0-b4";
const VERSION_KEY = "adro-app-version";

const STORES_TO_CLEAR = [
  "chat-sessions-storage",
  "dashboard-data-storage",
  "generated-chart-data-storage",
  "chart-analytics-storage",
  "backend-chat-store",
  "connection-storage",
  "settings-store",
];

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion !== APP_VERSION) {
        // New version — wipe all persisted store data for a fresh start
        STORES_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
        localStorage.setItem(VERSION_KEY, APP_VERSION);
      }
    } catch {
      // localStorage may not be available in SSR — ignore
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
