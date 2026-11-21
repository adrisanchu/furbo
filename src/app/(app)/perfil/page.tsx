import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { initials } from "@/components/app/avatars";
import { LevelChart } from "@/components/app/level-chart";
import { LevelIndicator } from "@/components/app/level-indicator";
import { formatShortDate } from "@/lib/domain/time";
import { formatRating } from "@/lib/domain/ratings";
import { cn } from "@/lib/utils";
import { canChangeNickname, nextNicknameChangeAt } from "@/lib/domain/nickname";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { POSITION_LABEL, type Position } from "@/lib/validation/profile";
import { levelHistory, myGroups, playerTotals } from "@/server/queries";
import { ProfileForm } from "./profile-form";
import { SignOutButton } from "./sign-out-button";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Perfil" };

const dayFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric", timeZone: "Europe/Madrid" });

export default async function ProfilePage() {
  const user = await requireUser();
  const [groups, history, [totals]] = await Promise.all([
    myGroups(user.id),
    levelHistory(user.id),
    playerTotals({ userId: user.id }),
  ]);
  const recent = history.filter((h) => h.matchId).slice(-5).reverse();
  const position = (user.preferredPosition ?? "any") as Position;
  const matchesPlayed = user.matchesPlayed ?? 0;
  const changedAt = user.nicknameChangedAt ? new Date(user.nicknameChangedAt) : null;
  const nextChange = nextNicknameChangeAt(changedAt);
  const nicknameLockedUntil =
    nextChange && !canChangeNickname(changedAt, new Date()) ? dayFmt.format(nextChange) : null;

  return (
    <>
      <header className="flex items-center gap-4 pt-2">
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-muted text-xl font-bold text-accent-foreground gamer:text-primary">
          {initials(user.name, user.email[0]?.toUpperCase())}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-[26px] font-bold tracking-[-0.02em]">{user.name || "Sin nombre"}</h1>
          <span className="text-sm font-semibold text-accent-foreground gamer:text-primary">@{user.nickname}</span>
          <span className="text-[13px] text-muted-foreground">
            {POSITION_LABEL[position]} · {groups.length} {groups.length === 1 ? "grupo" : "grupos"} · desde{" "}
            {monthFmt.format(new Date(user.createdAt))}
          </span>
        </div>
      </header>

      <LevelIndicator
        rating={user.rating ?? null}
        provisional={user.ratingProvisional ?? true}
        matchesPlayed={matchesPlayed}
      />

      {matchesPlayed === 0 && (
        <Button asChild variant="outline" size="lg">
          <Link href="/bienvenida?repetir=1">
            <RotateCcw aria-hidden="true" />
            Repetir la autoevaluación
          </Link>
        </Button>
      )}

      {totals && (
        <section aria-labelledby="numeros" className="flex flex-col gap-3">
          <h2 id="numeros" className="text-lg font-bold">
            Tus números
          </h2>
          <dl className="grid grid-cols-4 gap-2">
            {[
              ["Partidos", String(totals.matches)],
              ["G · E · P", `${totals.wins}·${totals.draws}·${totals.losses}`],
              ["Goles", String(totals.goals)],
              ["Asist.", String(totals.assists)],
              ["Golazos", String(totals.superGoals)],
              ["Paradones", String(totals.superSaves)],
              ["Nota media", totals.averageRating == null ? "–" : formatRating(Math.round(totals.averageRating * 10) / 10)],
              ["MVP", String(totals.mvps)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col items-center gap-0.5 rounded-xl border bg-card px-1 py-2.5">
                <dd className="font-display text-2xl leading-none font-bold tabular-nums">{value}</dd>
                <dt className="text-center text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-muted-foreground">
            En todos tus grupos. Compárate con los demás en las estadísticas de cada grupo.
          </p>
        </section>
      )}

      <section aria-labelledby="evolucion" className="flex flex-col gap-3">
        <h2 id="evolucion" className="text-lg font-bold">
          Evolución del nivel
        </h2>
        <div className="rounded-2xl border bg-card p-4">
          <LevelChart points={history.map((h) => ({ at: h.at, rating: h.ratingAfter, isAssessment: !h.matchId }))} />
        </div>
        {recent.length > 0 && (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {recent.map((h) => {
              const mine = h.team === "A" ? h.scoreA : h.scoreB;
              const theirs = h.team === "A" ? h.scoreB : h.scoreA;
              const outcome = mine == null || theirs == null ? "–" : mine > theirs ? "G" : mine === theirs ? "E" : "P";
              return (
                <li key={h.id}>
                  <Link href={`/partidos/${h.matchId}`} className="flex items-center gap-3 px-4 py-3">
                    <span
                      aria-label={outcome === "G" ? "Ganado" : outcome === "E" ? "Empate" : "Perdido"}
                      className={cn(
                        "flex size-8 flex-none items-center justify-center rounded-lg text-sm font-bold",
                        outcome === "G" && "bg-level-up/15 text-level-up",
                        outcome === "E" && "bg-muted text-muted-foreground",
                        outcome === "P" && "bg-level-down/15 text-level-down",
                      )}
                    >
                      {outcome}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium tabular-nums">
                        {mine}–{theirs} · <span className="text-muted-foreground">{h.groupName}</span>
                      </span>
                      <span className="text-[13px] text-muted-foreground">{formatShortDate(h.at)}</span>
                    </span>
                    <span
                      className={cn(
                        "font-display text-lg font-bold tabular-nums",
                        h.delta > 0 ? "text-level-up" : h.delta < 0 ? "text-level-down" : "text-muted-foreground",
                      )}
                    >
                      {h.delta > 0 ? "+" : h.delta < 0 ? "−" : "±"}
                      {Math.abs(h.delta).toFixed(2)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="datos" className="flex flex-col gap-3">
        <h2 id="datos" className="text-lg font-bold">
          Tus datos
        </h2>
        <ProfileForm
          defaults={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            nickname: user.nickname ?? "",
            preferredPosition: position,
          }}
          email={user.email}
          nicknameLockedUntil={nicknameLockedUntil}
        />
      </section>

      <ThemePicker saved={user.theme ?? "system"} />

      <SignOutButton />
    </>
  );
}
