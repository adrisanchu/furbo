"use client";

import { ChevronDown, Hand, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Stepper } from "@/components/form/stepper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { emptyLine, reportWarnings, statSummary, type PlayerLine, type StatKey, type Team } from "@/lib/domain/match-report";
import { formatEuros } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { saveMatchReport } from "@/server/actions/matches";

type Candidate = { userId: string; label: string; nickname: string | null; confirmed: boolean };

const STAT_FIELDS: { key: StatKey; label: string; cap?: StatKey; keeperFirst?: boolean }[] = [
  { key: "goals", label: "Goles" },
  { key: "superGoals", label: "Golazos", cap: "goals" },
  { key: "assists", label: "Asistencias" },
  { key: "saves", label: "Paradas", keeperFirst: true },
  { key: "superSaves", label: "Paradones", cap: "saves", keeperFirst: true },
  { key: "ownGoals", label: "En propia" },
];

/**
 * Admin form for the match report: line-up (team + goalkeeper) and, once the
 * match has started, the score and per-player stats.
 */
export function ReportForm({
  matchId,
  started,
  played,
  candidates,
  initialLines,
  initialScore,
}: {
  matchId: string;
  started: boolean;
  played: boolean;
  candidates: Candidate[];
  initialLines: PlayerLine[];
  initialScore: { A: number; B: number } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lines, setLines] = useState<Record<string, PlayerLine>>(() =>
    Object.fromEntries(initialLines.map((l) => [l.userId, l])),
  );
  const [score, setScore] = useState(initialScore ?? { A: 0, B: 0 });
  const [showOthers, setShowOthers] = useState(() =>
    candidates.some((c) => !c.confirmed && initialLines.some((l) => l.userId === c.userId)),
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const byId = useMemo(() => new Map(candidates.map((c) => [c.userId, c])), [candidates]);
  const confirmed = candidates.filter((c) => c.confirmed);
  const others = candidates.filter((c) => !c.confirmed);
  const lineList = Object.values(lines);
  const warnings = reportWarnings(lineList, started ? score : null);

  function setTeam(userId: string, team: Team | null) {
    setLines((prev) => {
      const next = { ...prev };
      if (!team) delete next[userId];
      else next[userId] = { ...(prev[userId] ?? emptyLine(userId, team)), team };
      return next;
    });
  }

  function patch(userId: string, change: Partial<PlayerLine>) {
    setLines((prev) => {
      const line = { ...prev[userId]!, ...change };
      // Golazos ⊆ goals, paradones ⊆ saves.
      line.superGoals = Math.min(line.superGoals, line.goals);
      line.superSaves = Math.min(line.superSaves, line.saves);
      return { ...prev, [userId]: line };
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await saveMatchReport(matchId, {
        players: lineList,
        result: started ? { scoreA: score.A, scoreB: score.B } : null,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        result.data.played
          ? result.data.corrected
            ? "Acta corregida: niveles recalculados"
            : "¡Acta guardada! Niveles actualizados"
          : "Alineación guardada",
      );
      if (result.data.resplit) {
        toast.info(`Reparto recalculado: ${formatEuros(result.data.resplit.perPlayerCents)} cada uno`);
      }
      router.push(`/partidos/${matchId}`);
    });
  }

  const teamCount = (team: Team) => lineList.filter((l) => l.team === team).length;

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="equipos" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="equipos" className="text-lg font-bold">
            Equipos
          </h2>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            A {teamCount("A")} · B {teamCount("B")}
          </span>
        </div>
        <p className="-mt-1 text-[13px] text-muted-foreground">
          {started
            ? "Marca quién jugó en cada equipo. Quien no aparezca no cuenta para el nivel ni las estadísticas."
            : "Prepara los equipos. Podrás ajustarlos después del partido, al registrar el resultado."}
        </p>
        <PlayerList candidates={confirmed} lines={lines} onTeam={setTeam} onKeeper={(id, v) => patch(id, { isGoalkeeper: v })} />
        {others.length > 0 &&
          (showOthers ? (
            <>
              <h3 className="mt-2 text-[13px] font-semibold text-muted-foreground">Otros miembros (no apuntados)</h3>
              <p className="-mt-1 text-[13px] text-muted-foreground">
                Si los pones a jugar, al guardar el acta pasan a pagar su parte y se recalcula el reparto de la pista.
              </p>
              <PlayerList candidates={others} lines={lines} onTeam={setTeam} onKeeper={(id, v) => patch(id, { isGoalkeeper: v })} />
            </>
          ) : (
            <Button type="button" variant="ghost" size="lg" onClick={() => setShowOthers(true)}>
              Añadir a alguien que no se apuntó ({others.length})
            </Button>
          ))}
      </section>

      {started && (
        <section aria-labelledby="marcador" className="flex flex-col gap-3">
          <h2 id="marcador" className="text-lg font-bold">
            Marcador
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((team) => (
              <div key={team} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4">
                <span className="text-[13px] font-semibold text-muted-foreground">Equipo {team}</span>
                <Stepper
                  label={`Goles del equipo ${team}`}
                  value={score[team]}
                  max={99}
                  size="lg"
                  onChange={(v) => setScore((s) => ({ ...s, [team]: v }))}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {started && lineList.length > 0 && (
        <section aria-labelledby="stats" className="flex flex-col gap-3">
          <h2 id="stats" className="text-lg font-bold">
            Estadísticas
          </h2>
          {(["A", "B"] as const).map((team) => {
            const roster = lineList
              .filter((l) => l.team === team)
              .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper));
            if (!roster.length) return null;
            return (
              <div key={team} className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Equipo {team}</h3>
                <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                  {roster.map((line) => {
                    const who = byId.get(line.userId);
                    const open = expanded === line.userId;
                    const summary = statSummary(line);
                    const fields = line.isGoalkeeper
                      ? [...STAT_FIELDS.filter((f) => f.keeperFirst), ...STAT_FIELDS.filter((f) => !f.keeperFirst)]
                      : STAT_FIELDS;
                    return (
                      <li key={line.userId} className="flex flex-col">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : line.userId)}
                          className="flex min-h-14 items-center gap-3 px-4 py-2.5 text-left"
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-1.5 truncate text-[15px] font-medium">
                              {who?.label ?? "Jugador"}
                              {line.isGoalkeeper && <Hand aria-label="Portero" className="size-4 text-muted-foreground" />}
                            </span>
                            <span className="truncate text-[13px] text-muted-foreground">{summary || "Sin estadísticas"}</span>
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")}
                          />
                        </button>
                        {open && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 pb-4">
                            {fields.map((f) => (
                              <div key={f.key} className="flex flex-col items-start gap-1">
                                <span className="text-[13px] font-medium text-muted-foreground">{f.label}</span>
                                <Stepper
                                  label={`${f.label} de ${who?.label ?? "jugador"}`}
                                  value={line[f.key]}
                                  max={f.cap ? line[f.cap] : 30}
                                  onChange={(v) => patch(line.userId, { [f.key]: v })}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {warnings.length > 0 && (
        <Alert className="border-warning/40 bg-warning/10">
          <TriangleAlert className="text-warning" />
          <AlertDescription>
            <ul className="flex flex-col gap-1">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <span className="mt-1 block text-[13px]">Puedes guardar igualmente y corregirlo después.</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Button size="xl" disabled={pending || (started && (!teamCount("A") || !teamCount("B")))} onClick={submit}>
          {pending && <Spinner />}
          {played ? "Corregir acta" : started ? "Guardar acta" : "Guardar alineación"}
        </Button>
        {started && (
          <p className="text-center text-[13px] text-muted-foreground">
            {played
              ? "Al corregir, se deshacen los cambios de nivel de este partido y se vuelven a calcular."
              : "Al guardar, el partido queda como jugado y se actualiza el nivel de quienes jugaron."}
          </p>
        )}
      </div>
    </div>
  );
}

function PlayerList({
  candidates,
  lines,
  onTeam,
  onKeeper,
}: {
  candidates: Candidate[];
  lines: Record<string, PlayerLine>;
  onTeam: (userId: string, team: Team | null) => void;
  onKeeper: (userId: string, value: boolean) => void;
}) {
  if (!candidates.length) {
    return <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">Nadie apuntado.</p>;
  }
  return (
    <ul className="flex flex-col divide-y rounded-2xl border bg-card">
      {candidates.map((c) => {
        const line = lines[c.userId];
        return (
          <li key={c.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{c.label}</span>
              {c.nickname && <span className="truncate text-[13px] text-muted-foreground">@{c.nickname}</span>}
            </span>
            <div role="radiogroup" aria-label={`Equipo de ${c.label}`} className="flex rounded-xl border bg-background p-0.5">
              {([["A", "A"], ["B", "B"], [null, "—"]] as const).map(([team, text]) => {
                const selected = (line?.team ?? null) === team;
                return (
                  <button
                    key={text}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={team ? `Equipo ${team}` : "No jugó"}
                    onClick={() => onTeam(c.userId, team)}
                    className={cn(
                      "flex h-10 min-w-11 items-center justify-center rounded-[10px] text-sm font-bold transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant={line?.isGoalkeeper ? "default" : "outline"}
              size="icon-lg"
              aria-label={`${c.label} es portero`}
              aria-pressed={line?.isGoalkeeper ?? false}
              disabled={!line}
              onClick={() => onKeeper(c.userId, !line?.isGoalkeeper)}
            >
              <Hand />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
