"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Applies the theme saved on the user's profile when they open the app on a
 * device (the choice is stored per user, PRD §6.1). Runs once per mount.
 */
export function ThemeSync({ saved }: { saved: string }) {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme && theme !== saved) setTheme(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync on mount / when the saved value changes
  }, [saved]);
  return null;
}
