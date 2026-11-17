import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { defaultMinPlayers, FORMAT_PLAYERS } from "@/lib/domain/matches";
import { defaultMatchSchedule } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { groupById } from "@/server/queries";
import { MatchForm } from "../../../../partidos/match-form";

export const metadata: Metadata = { title: "Convocar partido" };

export default async function NewMatchPage({ params }: PageProps<"/grupos/[id]/partidos/nuevo">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const [group, membership] = await Promise.all([groupById(id), getMembership(id, user.id)]);
  if (!group || membership?.status !== "active" || membership.role !== "admin") notFound();

  const { startsAt, signupDeadline } = defaultMatchSchedule(new Date());
  const max = FORMAT_PLAYERS[group.defaultFormat];

  return (
    <>
      <PageHeader backHref={`/grupos/${id}`} title="Convocar partido" eyebrow={group.name} />
      <MatchForm
        groupId={id}
        baseLabel={group.baseLabel}
        defaults={{
          startsAt,
          durationMin: "60",
          locationLabel: "",
          format: group.defaultFormat,
          maxPlayers: String(max),
          minPlayers: String(defaultMinPlayers(max)),
          courtPrice:
            group.defaultCourtPriceCents != null ? (group.defaultCourtPriceCents / 100).toString().replace(".", ",") : "",
          signupDeadline,
        }}
      />
    </>
  );
}
