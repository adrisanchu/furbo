import { Lock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupAvatar } from "@/components/app/avatars";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatLevel } from "@/lib/domain/level";
import { getSession } from "@/lib/session";
import { getMembership } from "@/server/authz";
import { inviteByToken } from "@/server/queries";
import { AcceptInvite } from "./accept-invite";

export const metadata: Metadata = { title: "Invitación" };

export default async function InvitationPage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const [found, session] = await Promise.all([inviteByToken(token), getSession()]);

  const invalidReason = !found
    ? "Esta invitación no existe."
    : found.invite.revokedAt
      ? "Esta invitación ya no es válida."
      : found.invite.expiresAt && found.invite.expiresAt <= new Date()
        ? "Esta invitación ha caducado."
        : found.invite.maxUses != null && found.invite.uses >= found.invite.maxUses
          ? "Esta invitación ya se ha usado del todo."
          : null;

  if (!found || invalidReason) {
    return (
      <>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Invitación no válida</h1>
        <Alert variant="destructive">
          <AlertDescription>{invalidReason} Pide un enlace nuevo a quien te lo pasó.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" size="xl">
          <Link href="/">Ir a Furbo</Link>
        </Button>
      </>
    );
  }

  const { group, invite } = found;
  const membership = session ? await getMembership(group.id, session.user.id) : null;
  const next = `/invitacion/${token}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-accent-foreground uppercase gamer:text-primary">
          Te han invitado a
        </span>
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{group.name}</h1>
      </div>

      <article className="flex flex-col gap-4 rounded-2xl border bg-card p-4 halo-border">
        <div className="flex items-center gap-3.5">
          <GroupAvatar id={group.id} name={group.name} className="size-12" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {group.visibility === "private" && <Lock aria-hidden="true" className="size-3.5" />}
              {group.visibility === "public" ? "Grupo público" : "Grupo privado"} · {group.membersCount}{" "}
              {group.membersCount === 1 ? "miembro" : "miembros"}
            </span>
            <span className="flex items-start gap-1.5 text-sm">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 flex-none text-muted-foreground" />
              {group.baseLabel}
            </span>
          </div>
          <span className="flex flex-col items-end">
            <span className="font-display text-[32px] leading-none font-bold">{formatLevel(group.level)}</span>
            <span className="text-[11px] text-muted-foreground">nivel medio</span>
          </span>
        </div>
        {group.description && <p className="text-sm leading-normal text-muted-foreground">{group.description}</p>}
      </article>

      {invite.email && (
        <p className="text-[13px] text-muted-foreground">Esta invitación es personal para {invite.email}.</p>
      )}

      {!session ? (
        <div className="flex flex-col gap-3">
          <Button asChild size="xl" className="halo">
            <Link href={`/registro?next=${encodeURIComponent(next)}`}>Crear cuenta y unirme</Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="h-[52px] text-[15px]">
            <Link href={`/entrar?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
          </Button>
        </div>
      ) : membership?.status === "active" ? (
        <Button asChild size="xl">
          <Link href={`/grupos/${group.id}`}>Ya eres miembro · Ver grupo</Link>
        </Button>
      ) : (
        <AcceptInvite token={token} needsOnboarding={session.user.rating == null} />
      )}
    </>
  );
}
