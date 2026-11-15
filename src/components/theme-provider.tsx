"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export const THEMES = ["dark", "light", "gamer"] as const;
export type ThemeName = (typeof THEMES)[number];

/**
 * One theme = one block of CSS variables under [data-theme] (globals.css).
 * Defaults to the OS preference until the user picks one in their profile.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      themes={[...THEMES]}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
