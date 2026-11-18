import { formatLevel, MAX_RATING, PROVISIONAL_MATCHES } from "@/lib/domain/level";
import { cn } from "@/lib/utils";

/**
 * Big level number with a progress ring and halo (PRD §6.1 "Indicador de
 * nivel"), plus the "provisional" badge until 5 matches are played.
 */
export function LevelIndicator({
  rating,
  provisional,
  matchesPlayed,
  className,
}: {
  rating: number | null;
  provisional: boolean;
  matchesPlayed: number;
  className?: string;
}) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const pct = rating ? rating / MAX_RATING : 0;
  return (
    <section aria-label="Tu nivel" className={cn("flex items-center gap-5 rounded-3xl border bg-card p-5", className)}>
      <div className="relative size-[124px] flex-none rounded-full halo">
        <svg viewBox="0 0 124 124" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="62" cy="62" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="62"
            cy="62"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[44px] leading-none font-bold">{formatLevel(rating)}</span>
          <span className="text-xs text-muted-foreground">de 10</span>
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {provisional ? (
          <>
            <span className="w-fit rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-warning">
              PROVISIONAL · {Math.min(matchesPlayed, PROVISIONAL_MATCHES)}/{PROVISIONAL_MATCHES}
            </span>
            <span className="text-sm leading-snug text-muted-foreground">
              {matchesPlayed >= PROVISIONAL_MATCHES
                ? "Tu nivel se fija con el próximo resultado."
                : `Se ajusta más rápido durante tus primeros ${PROVISIONAL_MATCHES} partidos.`}
            </span>
          </>
        ) : (
          <span className="w-fit rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-accent-foreground gamer:text-primary">
            NIVEL FIJADO
          </span>
        )}
      </div>
    </section>
  );
}
