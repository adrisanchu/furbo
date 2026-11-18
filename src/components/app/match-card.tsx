import Link from "next/link";
import { FORMAT_LABEL, priceIfJoining, type MatchFormat, type MatchStatus } from "@/lib/domain/matches";
import { formatEuros } from "@/lib/domain/money";
import { formatDay, formatDow, formatTime } from "@/lib/domain/time";
import { SpotsBar } from "./spots-bar";

export type MatchCardData = {
  id: string;
  groupName: string;
  startsAt: Date;
  format: MatchFormat;
  status: MatchStatus;
  maxPlayers: number;
  courtPriceCents: number;
  pricePerPlayerCents: number | null;
  confirmedCount: number;
  waitlistCount: number;
  myStatus?: "confirmed" | "waitlist" | "withdrawn" | null;
  myAmountDueCents?: number | null;
};

function priceLine(m: MatchCardData) {
  if (m.myStatus === "confirmed") {
    const mine = m.myAmountDueCents ?? (m.confirmedCount > 0 ? Math.ceil(m.courtPriceCents / m.confirmedCount) : 0);
    return { label: m.status === "closed" ? "Tu parte" : "Tu parte ahora", value: formatEuros(mine) };
  }
  if (m.myStatus === "waitlist") return { label: "Estás en lista de espera", value: null };
  const price = priceIfJoining(m);
  if (m.confirmedCount >= m.maxPlayers) return { label: "Completo · lista de espera", value: null };
  return price != null ? { label: "Si te apuntas ahora", value: formatEuros(price) } : { label: "", value: null };
}

/** Compact match card for lists (PRD §6.1 "Tarjeta de partido"). */
export function MatchCard({ match }: { match: MatchCardData }) {
  const price = priceLine(match);
  return (
    <Link
      href={`/partidos/${match.id}`}
      className="flex flex-col gap-3.5 rounded-2xl border bg-card p-4 transition-colors hover:border-subtle"
    >
      <div className="flex gap-3.5">
        <div className="flex w-14 flex-none flex-col items-center justify-center rounded-xl bg-muted py-2">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">{formatDow(match.startsAt)}</span>
          <span className="font-display text-[30px] leading-none font-bold">{formatDay(match.startsAt)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{match.groupName}</span>
            {match.myStatus === "confirmed" && (
              <span className="flex-none rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-accent-foreground gamer:text-primary">
                Apuntado
              </span>
            )}
            {match.status === "closed" && match.myStatus !== "confirmed" && (
              <span className="flex-none rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Cerrado
              </span>
            )}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {formatTime(match.startsAt)} · {FORMAT_LABEL[match.format]}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <SpotsBar filled={match.confirmedCount} max={match.maxPlayers} className="h-1.5 flex-1" />
            <span className="text-[13px] font-semibold tabular-nums">
              {match.confirmedCount}/{match.maxPlayers}
            </span>
          </span>
        </div>
      </div>
      {price.label && (
        <div className="flex items-baseline justify-between gap-3 text-[13px] text-muted-foreground">
          <span>{price.label}</span>
          {price.value && <span className="font-display text-xl font-bold text-foreground">{price.value}</span>}
        </div>
      )}
    </Link>
  );
}
