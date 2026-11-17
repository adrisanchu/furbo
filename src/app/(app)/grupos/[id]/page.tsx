import { CalendarPlus, Lock, MapPin, MessageCircle, Settings, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/app/action-button";
import { GroupAvatar, PlayerAvatar } from "@/components/app/avatars";
import { MatchCard } from "@/components/app/match-card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatLevel } from "@/lib/domain/level";
import { FORMAT_LABEL } from "@/lib/domain/matches";
import { formatEuros } from "@/lib/domain/money";
import { requireUser } from "@/lib/session";
import { POSITION_LABEL } from "@/lib/validation/profile";
import { idSchema } from "@/server/action";
import { joinPublicGroup, leaveGroup } from "@/server/actions/groups";
import { getMembership } from "@/server/authz";
import { groupBalances, groupById, groupMembersList, upcomingMatchesForUser } from "@/server/queries";
import { MemberActions } from "./member-actions";

export const metadata: Metadata = { title: "Grupo" };

export default async function GroupPage({ params }: PageProps<"/grupos/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const [group, membership] = await Promise.all([groupById(id), getMembership(id, user.id)]);
  if (!group) notFound();
  const isMember = membership?.status === "active";
  const isAdmin = isMember && membership.role === "admin";
  // Private groups are invisible to non-members (PRD §5.3).
  if (!isMember && group.visibility === "private") notFound();

  const [members, matches, balances] = isMember
    ? await Promise.all([groupMembersList(id), upcomingMatchesForUser(user.id, { groupId: id }), groupBalances(id)])
    : [[], [], null];
  const myDebt = balances?.debts.find((d) => d.userId === user.id);

  return (
    <>
      <PageHeader
        backHref="/grupos"
        actions={
          <>
            {group.whatsappUrl && isMember && (
              <Button asChild variant="outline" size="lg">
                <a href={group.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
            )}
            {isAdmin && (
              <Button asChild variant="outline" size="icon-lg" aria-label="Editar grupo">
                <Link href={`/grupos/${id}/editar`}>
                  <Settings />
                </Link>
              </Button>
            )}
          </>
        }
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <GroupAvatar id={group.id} name={group.name} className="size-14 rounded-2xl text-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {group.visibility === "private" && <Lock aria-hidden="true" className="size-3.5" />}
              {group.visibility === "public" ? "Grupo público" : "Grupo privado"} · {FORMAT_LABEL[group.defaultFormat]}
            </span>
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{group.name}</h1>
          </div>
        </div>
        {group.description && <p className="text-[15px] leading-normal text-muted-foreground">{group.description}</p>}
        <div className="grid grid-cols-[1fr_auto] items-end gap-3 rounded-2xl border bg-card p-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-start gap-1.5 text-sm">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 flex-none text-muted-foreground" />
              <span className="min-w-0">{group.baseLabel}</span>
            </span>
            <span className="text-[13px] text-muted-foreground">
              {group.membersCount} {group.membersCount === 1 ? "miembro" : "miembros"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Nivel medio</span>
            <span className="font-display text-[44px] leading-none font-bold">{formatLevel(group.level)}</span>
          </div>
        </div>
      </section>

      {!isMember && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Únete para ver sus partidos, apuntarte y ver quién juega.
          </p>
          {membership?.status === "banned" ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No puedes unirte a este grupo.</p>
          ) : (
            <ActionButton size="xl" className="halo" action={joinPublicGroup.bind(null, id)} success={`Ya eres de «${group.name}»`}>
              Unirme al grupo
            </ActionButton>
          )}
        </section>
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button asChild size="lg">
            <Link href={`/grupos/${id}/partidos/nuevo`}>
              <CalendarPlus aria-hidden="true" />
              Convocar partido
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/grupos/${id}/invitar`}>
              <UserPlus aria-hidden="true" />
              Invitar
            </Link>
          </Button>
        </div>
      )}

      {isMember && (
        <section aria-labelledby="proximos" className="flex flex-col gap-3">
          <SectionTitle id="proximos">Próximos partidos</SectionTitle>
          {matches.length === 0 ? (
            <EmptyState
              icon={<CalendarPlus aria-hidden="true" className="size-[22px]" />}
              title="No hay partidos convocados"
              body={isAdmin ? "Convoca el próximo y avisa al grupo." : "Cuando un admin convoque uno, aparecerá aquí."}
            />
          ) : (
            matches.map((m) => <MatchCard key={m.id} match={m} />)
          )}
        </section>
      )}

      {isMember && balances && (
        <section aria-labelledby="cuentas" className="flex flex-col gap-3">
          <SectionTitle
            id="cuentas"
            aside={
              balances.potCents > 0 ? (
                <span className="text-[13px] text-muted-foreground">Bote: {formatEuros(balances.potCents)}</span>
              ) : undefined
            }
          >
            Cuentas
          </SectionTitle>
          {isAdmin ? (
            balances.debts.length === 0 ? (
              <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
                Nadie debe nada. Cuentas al día.
              </p>
            ) : (
              <ul className="flex flex-col divide-y rounded-2xl border bg-card">
                {balances.debts.map((d) => (
                  <li key={d.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-medium">{d.name}</span>
                      <span className="text-[13px] text-muted-foreground">
                        {d.matchesCount} {d.matchesCount === 1 ? "partido" : "partidos"} sin pagar
                      </span>
                    </span>
                    <span className="font-display text-xl font-bold text-warning">{formatEuros(d.owedCents)}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 text-[15px]">
              <span>{myDebt ? "Tienes pendiente" : "Estás al día"}</span>
              {myDebt && <span className="font-display text-xl font-bold text-warning">{formatEuros(myDebt.owedCents)}</span>}
            </p>
          )}
          <p className="text-[13px] text-muted-foreground">
            Los pagos se hacen fuera de la app; el admin marca quién ha pagado en cada partido.
            {balances.potCents > 0 && " El bote es lo que sobra por redondear al céntimo."}
          </p>
        </section>
      )}

      {isMember && (
        <section aria-labelledby="miembros" className="flex flex-col gap-3">
          <SectionTitle id="miembros">Miembros por nivel</SectionTitle>
          <ol className="flex flex-col divide-y rounded-2xl border bg-card">
            {members.map((m, k) => (
              <li key={m.userId} className="flex items-center gap-3 py-2 pr-1.5 pl-4">
                <span className="w-5 text-right text-[13px] text-muted-foreground tabular-nums">{k + 1}</span>
                <PlayerAvatar id={m.userId} name={m.name} highlight={m.userId === user.id} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-medium">{m.userId === user.id ? "Tú" : m.name}</span>
                    {m.role === "admin" && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                        Admin
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {POSITION_LABEL[m.preferredPosition]}
                    {m.ratingProvisional && " · provisional"}
                  </span>
                </span>
                <span className="font-display text-xl font-bold tabular-nums">{formatLevel(m.rating)}</span>
                {isAdmin && m.userId !== user.id ? (
                  <MemberActions groupId={id} userId={m.userId} name={m.name} role={m.role} />
                ) : (
                  <span className="w-11" />
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {isMember && (
        <ActionButton
          variant="ghost"
          size="lg"
          className="text-destructive"
          action={leaveGroup.bind(null, id)}
          success="Has salido del grupo"
          redirectTo="/grupos"
          confirm={{
            title: "¿Salir del grupo?",
            description:
              "Te borraremos de sus próximos partidos. Si alguno ya está cerrado y nadie ocupa tu plaza, seguirás debiendo tu parte.",
            confirmLabel: "Salir del grupo",
          }}
        >
          Salir del grupo
        </ActionButton>
      )}
    </>
  );
}
