import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { fullName } from "@/lib/domain/nickname";
import { formatDateTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { matchById, matchLineup, matchRatings } from "@/server/queries";
import { RatingsForm } from "./ratings-form";

export const metadata: Metadata = { title: "Valorar jugadores" };

export default async function RateMatchPage({ params }: PageProps<"/partidos/[id]/valorar">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const match = await matchById(id);
  if (!match || match.status !== "played") notFound();
  const membership = await getMembership(match.groupId, user.id);
  if (membership?.status !== "active") notFound();

  const [lineup, ratings] = await Promise.all([matchLineup(id), matchRatings(id, user.id)]);

  return (
    <>
      <PageHeader
        backHref={`/partidos/${id}`}
        title="Valorar jugadores"
        eyebrow={`${match.groupName} · ${formatDateTime(match.startsAt)} · ${match.scoreA}–${match.scoreB}`}
      />
      <p className="-mt-3 text-sm text-muted-foreground">
        Pon una nota de 0 a 10 a cada uno según cómo jugó. Solo se ve la media de cada jugador, nunca tu nota.
      </p>
      <RatingsForm
        matchId={id}
        players={lineup.map((p) => ({
          userId: p.userId,
          label: p.userId === user.id ? "Tú" : fullName(p),
          team: p.team,
          isGoalkeeper: p.isGoalkeeper,
        }))}
        initial={Object.fromEntries(ratings.mine)}
      />
    </>
  );
}
