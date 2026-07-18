"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Suppress React 19 / Next.js 16 dev console warning overlay for next-themes script FOUC tag injection
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
      originalError.apply(console, args);
    };
  }

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
