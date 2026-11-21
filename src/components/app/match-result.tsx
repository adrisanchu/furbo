import { Hand } from "lucide-react";
import { formatLevel, roundRating } from "@/lib/domain/level";
import { statSummary } from "@/lib/domain/match-report";
import { fullName, shortName } from "@/lib/domain/nickname";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./avatars";

type LineupRow = {
  userId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  team: "A" | "B";
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
  saves: number;
  ownGoals: number;
  superGoals: number;
  superSaves: number;
  ratingBefore: number | null;
  delta: number | null;
  currentRating: number | null;
};

function formatDelta(delta: number) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  return `${sign}${Math.abs(delta).toFixed(2)}`;
}

/**
 * The "Resultado" block (design sketch): both teams with their average level,
 * each player's stats and level change (+0.12 / −0.08). Without a score it
 * shows the planned line-up.
 */
export function MatchResult({
  lineup,
  score,
  meId,
}: {
  lineup: LineupRow[];
  score: { A: number; B: number } | null;
  meId: string;
}) {
  const team = (t: "A" | "B") => lineup.filter((p) => p.team === t);
  // Average level the teams had going into the match (current level for a plan).
  const average = (rows: LineupRow[]) => {
    const values = rows.map((r) => r.ratingBefore ?? r.currentRating).filter((v): v is number => v != null);
    return values.length ? roundRating(values.reduce((a, b) => a + b, 0) / values.length) : null;
  };
  const winner = score ? (score.A > score.B ? "A" : score.B > score.A ? "B" : null) : null;

  return (
    <section aria-labelledby="resultado" className="flex flex-col gap-3">
      <h2 id="resultado" className="text-lg font-bold">
        {score ? "Resultado" : "Equipos previstos"}
      </h2>
      {score && (
        <div className="flex items-center justify-center gap-5 rounded-3xl border bg-card p-5 halo">
          <span className="flex flex-col items-center">
            <span className="text-[13px] font-semibold text-muted-foreground">Equipo A</span>
            <span className={cn("font-display text-[72px] leading-[0.9] font-bold", winner === "B" && "text-muted-foreground")}>
              {score.A}
            </span>
          </span>
          <span aria-hidden="true" className="font-display text-4xl text-subtle">
            –
          </span>
          <span className="flex flex-col items-center">
            <span className="text-[13px] font-semibold text-muted-foreground">Equipo B</span>
            <span className={cn("font-display text-[72px] leading-[0.9] font-bold", winner === "A" && "text-muted-foreground")}>
              {score.B}
            </span>
          </span>
          <span className="sr-only">{winner ? `Gana el equipo ${winner}` : "Empate"}</span>
        </div>
      )}
      <div className="grid gap-3 min-[420px]:grid-cols-2">
        {(["A", "B"] as const).map((t) => {
          const rows = team(t);
          const avg = average(rows);
          return (
            <div key={t} className="flex flex-col gap-2 rounded-2xl border bg-card p-3.5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-bold">Equipo {t}</h3>
                {avg != null && <span className="text-[13px] text-muted-foreground">nivel medio {formatLevel(avg)}</span>}
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin jugadores</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {rows.map((p) => {
                    const summary = statSummary(p);
                    return (
                      <li key={p.userId} className="flex items-center gap-2.5">
                        <PlayerAvatar id={p.userId} name={fullName(p)} highlight={p.userId === meId} className="size-8" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-1 truncate text-sm font-medium">
                            {p.userId === meId ? "Tú" : shortName(p)}
                            {p.isGoalkeeper && <Hand aria-label="Portero" className="size-3.5 flex-none text-muted-foreground" />}
                          </span>
                          {summary && <span className="truncate text-xs text-muted-foreground">{summary}</span>}
                        </span>
                        {p.delta != null && (
                          <span
                            className={cn(
                              "font-display text-base font-bold tabular-nums",
                              p.delta > 0 && "text-level-up",
                              p.delta < 0 && "text-level-down",
                              p.delta === 0 && "text-muted-foreground",
                            )}
                          >
                            {formatDelta(p.delta)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
