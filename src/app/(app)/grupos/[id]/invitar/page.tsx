import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/app/page-header";
import { absoluteUrl } from "@/lib/app-url";
import { formatDateTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { activeInvites, groupById } from "@/server/queries";
import { CopyButton, EmailInviteForm, InviteLinkForm, RevokeButton } from "./invite-forms";

export const metadata: Metadata = { title: "Invitar" };

export default async function InvitePage({ params }: PageProps<"/grupos/[id]/invitar">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const [group, membership] = await Promise.all([groupById(id), getMembership(id, user.id)]);
  if (!group || membership?.status !== "active" || membership.role !== "admin") notFound();
  const invites = await activeInvites(id);
  const now = new Date();
  const links = invites.filter((i) => !i.email);
  const emails = invites.filter((i) => i.email);

  const state = (i: (typeof invites)[number]) => {
    if (i.expiresAt && i.expiresAt <= now) return "Caducado";
    if (i.maxUses != null && i.uses >= i.maxUses) return "Agotado";
    return null;
  };

  return (
    <>
      <PageHeader backHref={`/grupos/${id}`} title="Invitar" eyebrow={group.name} />

      <section aria-labelledby="enlace" className="flex flex-col gap-3">
        <SectionTitle id="enlace">Enlace de invitación</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Quien lo abra entra en el grupo{group.visibility === "private" ? " aunque sea privado" : ""}. Pásalo por WhatsApp.
        </p>
        <InviteLinkForm groupId={id} />
        {links.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {links.map((i) => {
              const url = absoluteUrl(`/invitacion/${i.token}`);
              const status = state(i);
              return (
                <li key={i.id} className="flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5">
                  <code className="truncate rounded-lg bg-muted px-3 py-2 font-mono text-[13px]">{url}</code>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted-foreground">
                      {status ?? "Activo"} · {i.uses}
                      {i.maxUses != null ? `/${i.maxUses}` : ""} {i.uses === 1 ? "uso" : "usos"}
                      {i.expiresAt ? ` · caduca ${formatDateTime(i.expiresAt)}` : " · sin caducidad"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CopyButton text={url} disabled={Boolean(status)} />
                    <RevokeButton groupId={id} inviteId={i.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="email" className="flex flex-col gap-3">
        <SectionTitle id="email">Invitar por email</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Le llega un enlace personal, de un solo uso y válido 14 días. También sirve para readmitir a alguien expulsado.
        </p>
        <EmailInviteForm groupId={id} />
        {emails.length > 0 && (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {emails.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 pr-2 pl-4">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px]">{i.email}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {i.uses > 0 ? "Aceptada" : (state(i) ?? "Pendiente")}
                  </span>
                </span>
                {i.uses === 0 && <RevokeButton groupId={id} inviteId={i.id} compact />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
