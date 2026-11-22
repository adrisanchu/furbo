import { Check, ChevronRight, ClipboardList, CreditCard, MapPin, Star, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupAvatar } from "@/components/app/avatars";
import { MatchCard, type MatchCardData } from "@/components/app/match-card";
import { EmptyState, SectionTitle } from "@/components/app/page-header";
import { SpotsBar } from "@/components/app/spots-bar";
import { Button } from "@/components/ui/button";
import { formatLevel } from "@/lib/domain/level";
import { FORMAT_LABEL } from "@/lib/domain/matches";
import { costPerPlayerCents, formatEuros } from "@/lib/domain/money";
import { formatLongDate, formatRelativeDay, formatShortDate, formatTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import {
  matchesToRate,
  myGroups,
  pendingPaymentsForUser,
  pendingReportsForAdmin,
  upcomingMatchesForUser,
} from "@/server/queries";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const user = await requireUser();
  const [matches, groups, pending, reports, toRate] = await Promise.all([
    upcomingMatchesForUser(user.id),
    myGroups(user.id),
    pendingPaymentsForUser(user.id),
    pendingReportsForAdmin(user.id),
    matchesToRate(user.id),
  ]);
  const now = new Date();
  const next = matches.find((m) => m.myStatus === "confirmed");
  const open = matches.filter((m) => m.myStatus !== "confirmed" && m.myStatus !== "waitlist" && m.id !== next?.id).slice(0, 3);
  const pendingTotal = pending.reduce((sum, p) => sum + (p.amountDueCents ?? 0), 0);
  const pendingGroups = [...new Set(pending.map((p) => p.groupName))];
  const firstName = user.firstName ?? user.name?.split(" ")[0];

  return (
    <>
      <header className="flex flex-col gap-0.5 pt-2">
        <span className="text-[13px] text-muted-foreground first-letter:uppercase">{formatLongDate(now)}</span>
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">{firstName ? `Hola, ${firstName}` : "Hola"}</h1>
      </header>

      {reports.length > 0 && (
        <Link
          href={`/partidos/${reports[0]!.id}/acta`}
          className="flex items-center gap-3.5 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3.5"
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardList aria-hidden="true" className="size-[22px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">
              {reports.length === 1 ? "Falta el acta de un partido" : `Faltan ${reports.length} actas`}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">
              {reports[0]!.groupName} · {formatShortDate(reports[0]!.startsAt)}. Registra el resultado y quién marcó.
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 flex-none text-muted-foreground" />
        </Link>
      )}

      {toRate.length > 0 && (
        <Link
          href={`/partidos/${toRate[0]!.id}/valorar`}
          className="flex items-center gap-3.5 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:border-subtle"
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Star aria-hidden="true" className="size-[22px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Valora el último partido</span>
            <span className="truncate text-[13px] text-muted-foreground">
              {toRate[0]!.groupName} · {formatShortDate(toRate[0]!.startsAt)}. ¿Quién fue el MVP?
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 flex-none text-muted-foreground" />
        </Link>
      )}

      <section aria-labelledby="proximo" className="flex flex-col gap-3">
        <h2 id="proximo" className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Tu próximo partido
        </h2>
        {next ? (
          <NextMatchCard match={next} now={now} />
        ) : (
          <EmptyState
            title="Aún no tienes partidos"
            body={
              groups.length
                ? "Apúntate a uno de tus grupos y aquí verás la hora, las plazas y cuánto te toca pagar."
                : "Únete a un grupo o crea el tuyo para empezar a jugar."
            }
          />
        )}
      </section>

      {pending.length > 0 && (
        <Link
          href={`/partidos/${pending[0]!.matchId}`}
          className="flex items-center gap-3.5 rounded-2xl border bg-card px-4 py-3.5"
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-warning/15 text-warning">
            <CreditCard aria-hidden="true" className="size-[22px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">
              {pending.length === 1 ? "1 pago pendiente" : `${pending.length} pagos pendientes`}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">{pendingGroups.join(" · ")}</span>
          </span>
          <span className="font-display text-[26px] font-bold text-warning">{formatEuros(pendingTotal)}</span>
        </Link>
      )}

      <section aria-labelledby="grupos" className="flex flex-col gap-3">
        <SectionTitle
          id="grupos"
          aside={
            <Link href="/grupos" className="text-sm font-semibold text-accent-foreground gamer:text-primary">
              {groups.length ? "Ver todos" : "Explorar"}
            </Link>
          }
        >
          Mis grupos
        </SectionTitle>
        {groups.length === 0 ? (
          <EmptyState
            icon={<UsersRound aria-hidden="true" className="size-[22px]" />}
            title="Todavía no estás en ningún grupo"
            body="Crea el de tus pachangas o únete con el enlace que te pase tu grupo."
          >
            <div className="mt-2 flex gap-2">
              <Button asChild size="lg">
                <Link href="/grupos/nuevo">Crear grupo</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/grupos">Explorar</Link>
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/grupos/${g.id}`}
                className="flex w-[156px] flex-none flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-subtle"
              >
                <GroupAvatar id={g.id} name={g.name} />
                <span className="line-clamp-2 text-[15px] leading-tight font-semibold">{g.name}</span>
                <span className="mt-auto flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{g.membersCount} miembros</span>
                  <span className="font-display text-xl font-bold">{formatLevel(g.level)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {open.length > 0 && (
        <section aria-labelledby="abiertos" className="flex flex-col gap-3">
          <SectionTitle id="abiertos">Partidos en tus grupos</SectionTitle>
          {open.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>
      )}
    </>
  );
}

function NextMatchCard({ match, now }: { match: MatchCardData & { locationLabel: string }; now: Date }) {
  const share = match.myAmountDueCents ?? costPerPlayerCents(match.courtPriceCents, match.confirmedCount);
  return (
    <article className="flex flex-col gap-[18px] rounded-3xl bg-card p-5 halo halo-border">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex-none rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground gamer:text-primary">
            {FORMAT_LABEL[match.format]}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">{match.groupName}</span>
        </div>
        <span className="flex flex-none items-center gap-1 text-xs font-semibold">
          <Check aria-hidden="true" className="size-3.5 text-level-up" strokeWidth={2.6} />
          Apuntado
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground">
            {formatShortDate(match.startsAt)}
          </span>
          <span className="font-display text-[72px] leading-[0.9] font-bold">{formatTime(match.startsAt)}</span>
        </div>
        <span className="pb-1.5 text-[13px] text-muted-foreground">{formatRelativeDay(match.startsAt, now)}</span>
      </div>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin aria-hidden="true" className="size-4 flex-none" />
        <span className="truncate">{match.locationLabel}</span>
      </span>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-muted-foreground">Plazas</span>
          <span className="font-display text-2xl font-bold">
            {match.confirmedCount}
            <span className="text-subtle">/{match.maxPlayers}</span>
          </span>
        </div>
        <SpotsBar filled={match.confirmedCount} max={match.maxPlayers} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{match.status === "closed" ? "Tu parte" : "Tu parte ahora"}</span>
          <span className="font-display text-[34px] leading-none font-bold">{formatEuros(share)}</span>
        </div>
        <Button asChild size="lg" className="h-12">
          <Link href={`/partidos/${match.id}`}>
            Ver partido
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
