"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** − value + control for small counters (goals, saves…). 44px touch targets. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 30,
  size = "md",
}: {
  /** Accessible name, e.g. "Goles de Álex". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "md" | "lg";
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Restar: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </Button>
      <output
        aria-live="polite"
        className={cn(
          "min-w-9 text-center font-display font-bold tabular-nums",
          size === "lg" ? "text-[44px] leading-none" : "text-2xl",
        )}
      >
        {value}
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Sumar: ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}
