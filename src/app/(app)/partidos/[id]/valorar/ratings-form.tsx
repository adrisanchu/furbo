"use client";

import { Hand, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatRating, RATING_MAX, RATING_MIN, RATING_STEP } from "@/lib/domain/ratings";
import { cn } from "@/lib/utils";
import { rateMatch } from "@/server/actions/ratings";

type Player = { userId: string; label: string; team: "A" | "B"; isGoalkeeper: boolean };

/** One 0–10 (half-point) slider per player; untouched players stay "Sin nota". */
export function RatingsForm({
  matchId,
  players,
  initial,
}: {
  matchId: string;
  players: Player[];
  initial: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(players.map((p) => [p.userId, initial[p.userId] ?? null])),
  );
  const changed = players.filter((p) => (scores[p.userId] ?? null) !== (initial[p.userId] ?? null));
  const rated = players.filter((p) => scores[p.userId] != null).length;

  function submit() {
    startTransition(async () => {
      const result = await rateMatch(matchId, {
        ratings: changed.map((p) => ({ userId: p.userId, score: scores[p.userId] ?? null })),
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(rated === 1 ? "Nota guardada" : `Notas guardadas (${rated})`);
      router.push(`/partidos/${matchId}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {(["A", "B"] as const).map((team) => {
        const roster = players.filter((p) => p.team === team);
        if (!roster.length) return null;
        return (
          <section key={team} aria-labelledby={`equipo-${team}`} className="flex flex-col gap-2">
            <h2 id={`equipo-${team}`} className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Equipo {team}
            </h2>
            <ul className="flex flex-col divide-y rounded-2xl border bg-card">
              {roster.map((p) => {
                const score = scores[p.userId] ?? null;
                const inputId = `nota-${p.userId}`;
                return (
                  <li key={p.userId} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor={inputId} className="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] font-medium">
                        <span className="truncate">{p.label}</span>
                        {p.isGoalkeeper && <Hand aria-label="Portero" className="size-4 flex-none text-muted-foreground" />}
                      </label>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "font-display text-[28px] leading-none font-bold tabular-nums",
                          score == null && "text-sm font-sans font-medium text-subtle",
                        )}
                      >
                        {score == null ? "Sin nota" : formatRating(score)}
                      </span>
                      {score != null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          aria-label={`Quitar la nota de ${p.label}`}
                          onClick={() => setScores((s) => ({ ...s, [p.userId]: null }))}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    <input
                      id={inputId}
                      type="range"
                      min={RATING_MIN}
                      max={RATING_MAX}
                      step={RATING_STEP}
                      value={score ?? 5}
                      aria-valuetext={score == null ? "Sin nota" : formatRating(score)}
                      onChange={(e) => setScores((s) => ({ ...s, [p.userId]: Number(e.target.value) }))}
                      className={cn("h-11 w-full accent-primary", score == null && "opacity-40")}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="flex flex-col gap-2">
        <Button size="xl" disabled={pending || changed.length === 0} onClick={submit}>
          {pending && <Spinner />}
          Guardar notas
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          {rated} de {players.length} valorados. Puedes cambiar tus notas cuando quieras.
        </p>
      </div>
    </div>
  );
}
