import { AlertTriangle, Ban, MapPin, Navigation, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/app/action-button";
import { PlayerAvatar } from "@/components/app/avatars";
import { PageHeader, SectionTitle } from "@/components/app/page-header";
import { SpotsBar, spotsLabel } from "@/components/app/spots-bar";
import { Button } from "@/components/ui/button";
import { formatLevel, roundRating } from "@/lib/domain/level";
import { FORMAT_LABEL, isFrozen, priceIfJoining, STATUS_LABEL } from "@/lib/domain/matches";
import { costPerPlayerCents, formatEuros } from "@/lib/domain/money";
import { formatDateTime, formatLongDate, formatRelativeDay, formatTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { idSchema } from "@/server/action";
import { cancelMatch, closeMatch } from "@/server/actions/matches";
import { getMembership } from "@/server/authz";
import { matchById, matchSignupsList } from "@/server/queries";
import { MatchCta, type CtaState } from "./match-cta";
import { PaymentToggle } from "./payment-toggle";

export const metadata: Metadata = { title: "Partido" };

export default async function MatchPage({ params }: PageProps<"/partidos/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const match = await matchById(id);
  if (!match) notFound();
  const membership = await getMembership(match.groupId, user.id);
  const isMember = membership?.status === "active";
  const isAdmin = isMember && membership.role === "admin";
  if (!isMember) notFound();

  const signups = await matchSignupsList(id);
  const confirmed = signups.filter((s) => s.status === "confirmed").sort((a, b) => +a.createdAt - +b.createdAt);
  const waitlist = signups.filter((s) => s.status === "waitlist");
  const owingWithdrawn = signups.filter((s) => s.status === "withdrawn" && s.amountDueCents != null && s.amountDueCents > 0);
  const me = signups.find((s) => s.userId === user.id);
  const now = new Date();
  const frozen = isFrozen(match, now);
  const full = confirmed.length >= match.maxPlayers;
  const isOpen = match.status === "open";
  const isClosed = match.status === "closed";
  const isCancelled = match.status === "cancelled";
  const end = new Date(match.startsAt.getTime() + match.durationMin * 60_000);
  const avgLevel = confirmed.filter((s) => s.rating != null);
  const avg = avgLevel.length ? roundRating(avgLevel.reduce((a, s) => a + s.rating!, 0) / avgLevel.length) : null;

  // Price box
  const myLive = me?.status === "confirmed" ? (me.amountDueCents ?? costPerPlayerCents(match.courtPriceCents, confirmed.length)) : null;
  const joinPrice = priceIfJoining({ ...match, confirmedCount: confirmed.length });
  const price = isCancelled
    ? null
    : myLive != null
      ? { label: isOpen ? "Tu parte ahora" : "Tu parte", cents: myLive }
      : isOpen && !full
        ? { label: "Si te apuntas ahora", cents: joinPrice ?? 0 }
        : { label: "Precio por jugador", cents: match.pricePerPlayerCents ?? costPerPlayerCents(match.courtPriceCents, confirmed.length) };
  const divisor = isOpen && myLive == null && !full ? confirmed.length + 1 : Math.max(confirmed.length, 1);

  // Call to action
  const cta: CtaState = (() => {
    if (isCancelled) return { kind: "info", hint: "Partido cancelado", sub: "No hay nada que pagar" };
    if (match.status === "played") return { kind: "info", hint: "Partido jugado", sub: formatLongDate(match.startsAt) };
    if (frozen) return { kind: "info", hint: "El partido ya ha empezado", sub: "Ya no se admiten cambios" };
    if (me?.status === "confirmed") {
      const warning = isClosed
        ? waitlist.length > 0
          ? "El primero de la lista de espera ocupará tu plaza y asumirá tu parte."
          : `La inscripción está cerrada: si nadie ocupa tu plaza, seguirás debiendo ${formatEuros(myLive ?? 0)}.`
        : null;
      return { kind: "leave", hint: "Estás dentro", sub: `Tu parte: ${formatEuros(myLive ?? 0)}`, label: "Borrarme", warning };
    }
    if (me?.status === "waitlist") {
      return {
        kind: "leave",
        hint: `Eres el ${me.positionInQueue}.º en la lista`,
        sub: "Entras si alguien se borra",
        label: "Salir de la lista",
        warning: "Perderás tu puesto en la lista de espera.",
      };
    }
    if (full) {
      return { kind: "join", hint: "Partido completo", sub: `Entrarías el ${waitlist.length + 1}.º en la lista`, label: "Lista de espera" };
    }
    const free = match.maxPlayers - confirmed.length;
    return {
      kind: "join",
      hint: free === 1 ? "Queda 1 plaza" : `Quedan ${free} plazas`,
      sub: `Pagarías ${formatEuros(joinPrice ?? 0)}`,
      label: "Me apunto",
    };
  })();

  const mapsUrl = match.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${match.location.lat},${match.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.locationLabel)}`;

  const payments = [...confirmed, ...owingWithdrawn].filter((s) => s.amountDueCents != null && s.amountDueCents > 0);
  const paidCount = payments.filter((p) => p.paid).length;

  return (
    <>
      <PageHeader
        backHref={`/grupos/${match.groupId}`}
        backLabel={`Volver a ${match.groupName}`}
        actions={
          <>
            {isAdmin && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Eres admin</span>}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isOpen && "bg-primary/15 text-accent-foreground gamer:text-primary",
                isClosed && "bg-muted text-foreground",
                isCancelled && "bg-destructive/15 text-destructive",
              )}
            >
              {STATUS_LABEL[match.status]}
            </span>
          </>
        }
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-accent-foreground gamer:text-primary">
            {FORMAT_LABEL[match.format]}
          </span>
          <Link href={`/grupos/${match.groupId}`} className="truncate text-[13px] text-muted-foreground hover:text-foreground">
            {match.groupName}
          </Link>
        </div>
        <h1 className="flex flex-col">
          <span className="text-[13px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {formatLongDate(match.startsAt)} · {formatRelativeDay(match.startsAt, now)}
          </span>
          <span className="flex items-baseline gap-2">
            <span className={cn("font-display text-[88px] leading-[0.9] font-bold", isCancelled && "line-through opacity-60")}>
              {formatTime(match.startsAt)}
            </span>
            <span className="font-display text-2xl font-semibold text-muted-foreground">– {formatTime(end)}</span>
          </span>
        </h1>
        {isOpen && (
          <span className="text-[13px] text-muted-foreground">Inscripción hasta el {formatDateTime(match.signupDeadline)}</span>
        )}
      </section>

      {isCancelled && (
        <p className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <Ban aria-hidden="true" className="size-4 text-destructive" /> Este partido se ha cancelado.
        </p>
      )}
      {isAdmin && isClosed && match.belowMinimumAt && confirmed.length < match.minPlayers && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <p className="flex items-start gap-2 text-sm">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 flex-none text-warning" />
            Se cerró con {confirmed.length} de {match.minPlayers} jugadores mínimos. ¿Lo jugáis igualmente o lo cancelas?
          </p>
        </div>
      )}

      <section aria-label="Lugar" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <MapPin aria-hidden="true" className="size-5 flex-none text-muted-foreground" />
        <span className="min-w-0 flex-1 text-[15px]">{match.locationLabel}</span>
        <Button asChild variant="outline" size="lg">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden="true" />
            Cómo llegar
          </a>
        </Button>
      </section>

      {!isCancelled && (
        <section aria-label="Plazas y precio" className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <span className="text-[13px] text-muted-foreground">Plazas</span>
            <span className="font-display text-[40px] leading-none font-bold">
              {confirmed.length}
              <span className="text-subtle">/{match.maxPlayers}</span>
            </span>
            <SpotsBar filled={confirmed.length} max={match.maxPlayers} />
            <span className={cn("text-[13px] font-semibold", full ? "text-accent-foreground gamer:text-primary" : "text-muted-foreground")}>
              {spotsLabel(confirmed.length, match.maxPlayers)}
            </span>
          </div>
          {price && (
            <div className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4", myLive != null && "halo-border")}>
              <span className="text-[13px] text-muted-foreground">{price.label}</span>
              <span className="font-display text-[40px] leading-none font-bold">{formatEuros(price.cents)}</span>
              <span className="text-[13px] text-muted-foreground">
                {isOpen ? "Pista" : "Fijado al cerrar ·"} {formatEuros(match.courtPriceCents)} ÷ {divisor}
              </span>
              {isOpen && (
                <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-accent-foreground gamer:text-primary">
                  <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
                  EN VIVO
                </span>
              )}
              {me?.status === "confirmed" && isClosed && (
                <span className={cn("text-[13px] font-semibold", me.paid ? "text-level-up" : "text-warning")}>
                  {me.paid ? "Pagado" : "Pendiente de pago"}
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="apuntados" className="flex flex-col gap-3">
        <SectionTitle
          id="apuntados"
          aside={
            <span className="text-[13px] text-muted-foreground">
              {confirmed.length} {confirmed.length === 1 ? "jugador" : "jugadores"}
              {avg != null && ` · nivel medio ${formatLevel(avg)}`}
            </span>
          }
        >
          Apuntados
        </SectionTitle>
        {confirmed.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            Nadie se ha apuntado todavía. ¡Estrénalo!
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {confirmed.map((s) => (
              <li key={s.userId} className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5">
                <PlayerAvatar id={s.userId} name={s.name} highlight={s.userId === user.id} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{s.userId === user.id ? "Tú" : s.name.split(" ")[0]}</span>
                  <span className="text-xs text-muted-foreground">{formatLevel(s.rating)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="espera" className="flex flex-col gap-3">
        <SectionTitle id="espera" aside={<span className="text-[13px] text-muted-foreground">{waitlist.length} en espera</span>}>
          Lista de espera
        </SectionTitle>
        {waitlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nadie en espera. Cuando se llenen las {match.maxPlayers} plazas, los siguientes entran aquí por orden.
          </p>
        ) : (
          <ol className="flex flex-col divide-y rounded-2xl border bg-card">
            {waitlist.map((s) => (
              <li key={s.userId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 font-display text-lg font-bold">{s.positionInQueue}</span>
                <PlayerAvatar id={s.userId} name={s.name} highlight={s.userId === user.id} />
                <span className="flex-1 truncate text-sm font-medium">{s.userId === user.id ? "Tú" : s.name}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isAdmin && payments.length > 0 && (isClosed || match.status === "played") && (
        <section aria-labelledby="pagos" className="flex flex-col gap-3">
          <SectionTitle
            id="pagos"
            aside={
              <span className="text-[13px] text-muted-foreground">
                {paidCount}/{payments.length} pagados
              </span>
            }
          >
            Pagos
          </SectionTitle>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {payments.map((p) => (
              <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">{p.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {formatEuros(p.amountDueCents!)}
                    {p.status === "withdrawn" && " · se borró tarde"}
                  </span>
                </span>
                <PaymentToggle matchId={id} userId={p.userId} name={p.name} paid={p.paid} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (isOpen || isClosed) && (
        <section aria-labelledby="gestion" className="flex flex-col gap-3">
          <SectionTitle id="gestion">Gestión del partido</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <Button asChild variant="outline" size="lg">
              <Link href={`/partidos/${id}/editar`}>
                <Pencil aria-hidden="true" />
                Editar
              </Link>
            </Button>
            {isOpen ? (
              <ActionButton
                variant="outline"
                size="lg"
                action={closeMatch.bind(null, id)}
                success="Inscripción cerrada: las partes quedan fijadas"
                confirm={{
                  title: "¿Cerrar la inscripción ahora?",
                  description: `Cada uno de los ${confirmed.length} apuntados pagará ${formatEuros(costPerPlayerCents(match.courtPriceCents, confirmed.length))}. Los que lleguen después irán a la lista de espera.`,
                  confirmLabel: "Cerrar inscripción",
                }}
              >
                Cerrar inscripción
              </ActionButton>
            ) : (
              <span />
            )}
          </div>
          <ActionButton
            variant="ghost"
            size="lg"
            className="text-destructive"
            action={cancelMatch.bind(null, id)}
            success="Partido cancelado"
            confirm={{
              title: "¿Cancelar el partido?",
              description: "Se anulan las partes pendientes de pago. Lo ya pagado queda registrado para devolverlo fuera de la app.",
              confirmLabel: "Cancelar partido",
            }}
          >
            Cancelar partido
          </ActionButton>
          {isOpen && (
            <p className="text-[13px] text-muted-foreground">
              Al cerrar la inscripción (a mano, al llenarse o al llegar la fecha límite) el precio queda fijado y podrás marcar quién ha pagado.
            </p>
          )}
        </section>
      )}

      <div aria-hidden="true" className="h-16" />
      <MatchCta matchId={id} state={cta} />
    </>
  );
}
