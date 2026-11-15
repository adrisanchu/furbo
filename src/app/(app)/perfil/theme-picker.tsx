"use client";

import { useTheme } from "next-themes";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveTheme } from "./actions";

const options = [
  { value: "system", label: "Sistema", swatch: ["#0b0d10", "#f5f6f4"] },
  { value: "dark", label: "Oscuro", swatch: ["#0b0d10", "#2be36b"] },
  { value: "light", label: "Claro", swatch: ["#f5f6f4", "#1fbf57"] },
  { value: "gamer", label: "Gamer", swatch: ["#22e8ff", "#ff3dd8"] },
] as const;

export function ThemePicker({ saved }: { saved: string }) {
  const { theme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();
  const current = theme ?? saved;

  function choose(value: string) {
    setTheme(value);
    startTransition(async () => {
      const { ok } = await saveTheme(value);
      if (!ok) toast.error("No hemos podido guardar el tema.");
    });
  }

  return (
    <fieldset className="flex flex-col gap-3" aria-busy={pending}>
      <legend className="mb-3 text-lg font-bold">Tema</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((o) => {
          const selected = current === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 text-[15px] font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                selected && "border-primary bg-primary/10",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={o.value}
                checked={selected}
                onChange={() => choose(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="size-6 flex-none rounded-full border"
                style={{ background: `linear-gradient(135deg, ${o.swatch[0]} 50%, ${o.swatch[1]} 50%)` }}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
