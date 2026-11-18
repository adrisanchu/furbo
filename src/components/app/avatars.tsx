import { cn } from "@/lib/utils";

/** Accent hues for monograms; mixed with the theme so they work in light and dark. */
const HUES = ["#2be36b", "#a78bfa", "#fb923c", "#38bdf8", "#f472b6", "#facc15"];

function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

export function initials(name: string | null | undefined, fallback = "?") {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function monogramStyle(seed: string): React.CSSProperties {
  const hue = hueFor(seed);
  return {
    background: `color-mix(in oklch, ${hue} 20%, var(--card))`,
    color: `color-mix(in oklch, ${hue} 55%, var(--foreground))`,
  };
}

export function GroupAvatar({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={monogramStyle(id)}
      className={cn("flex size-10 flex-none items-center justify-center rounded-xl text-sm font-bold", className)}
    >
      {initials(name)}
    </span>
  );
}

export function PlayerAvatar({
  id,
  name,
  highlight,
  className,
}: {
  id: string;
  name: string | null;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={highlight ? undefined : monogramStyle(id)}
      className={cn(
        "flex size-9 flex-none items-center justify-center rounded-full text-xs font-bold",
        highlight && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
