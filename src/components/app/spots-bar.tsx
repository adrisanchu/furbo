import { cn } from "@/lib/utils";

/** Filled spots, e.g. 8/10 (PRD §6.1: "barra de plazas"). */
export function SpotsBar({ filled, max, className }: { filled: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (filled / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Plazas ocupadas"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={filled}
      className={cn("h-2 overflow-hidden rounded-full bg-border", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function spotsLabel(filled: number, max: number) {
  const free = max - filled;
  if (free <= 0) return "Completo";
  return free === 1 ? "1 plaza libre" : `${free} plazas libres`;
}
