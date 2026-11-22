import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { fullName } from "@/lib/domain/nickname";
import { areRatingsOpen, ratingsDeadline } from "@/lib/domain/rating-bonus";
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
  const open = areRatingsOpen(match, new Date());
  const deadline = match.ratingsClosedAt ?? ratingsDeadline(match.resultRecordedAt ?? match.startsAt);

  return (
    <>
      <PageHeader
        backHref={`/partidos/${id}`}
        title="Valorar jugadores"
        eyebrow={`${match.groupName} · ${formatDateTime(match.startsAt)} · ${match.scoreA}–${match.scoreB}`}
      />
      <p className="-mt-3 text-sm text-muted-foreground">
        {open
          ? `Pon una nota de 0 a 10 a cada uno según cómo jugó, hasta el ${formatDateTime(deadline)}. Solo se ve la media de cada jugador, nunca tu nota. Después, las notas de los demás ajustan un poco el nivel.`
          : `Las notas se cerraron el ${formatDateTime(deadline)} y ya cuentan para el nivel. Estas son las que pusiste.`}
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
        readOnly={!open}
      />
    </>
  );
}
