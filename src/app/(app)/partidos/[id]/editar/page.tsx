import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { utcToZonedLocal } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { matchById } from "@/server/queries";
import { MatchForm } from "../../match-form";

export const metadata: Metadata = { title: "Editar partido" };

export default async function EditMatchPage({ params }: PageProps<"/partidos/[id]/editar">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const match = await matchById(id);
  if (!match) notFound();
  const membership = await getMembership(match.groupId, user.id);
  if (membership?.status !== "active" || membership.role !== "admin") notFound();
  if (match.status !== "open" && match.status !== "closed") notFound();

  return (
    <>
      <PageHeader backHref={`/partidos/${id}`} title="Editar partido" eyebrow={match.groupName} />
      <MatchForm
        groupId={match.groupId}
        matchId={id}
        baseLabel={match.groupBaseLabel}
        closed={match.status === "closed"}
        defaults={{
          startsAt: utcToZonedLocal(match.startsAt),
          durationMin: String(match.durationMin),
          locationLabel: match.locationLabel === match.groupBaseLabel ? "" : match.locationLabel,
          format: match.format,
          maxPlayers: String(match.maxPlayers),
          minPlayers: String(match.minPlayers),
          courtPrice: (match.courtPriceCents / 100).toString().replace(".", ","),
          signupDeadline: utcToZonedLocal(match.signupDeadline),
        }}
      />
    </>
  );
}
