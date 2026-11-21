import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { fullName } from "@/lib/domain/nickname";
import { formatDateTime } from "@/lib/domain/time";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { matchById, matchLineup, reportCandidates } from "@/server/queries";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Acta del partido" };

export default async function MatchReportPage({ params }: PageProps<"/partidos/[id]/acta">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const match = await matchById(id);
  if (!match || match.status === "cancelled") notFound();
  const membership = await getMembership(match.groupId, user.id);
  if (membership?.status !== "active" || membership.role !== "admin") notFound();

  const [candidates, lineup] = await Promise.all([reportCandidates(id, match.groupId), matchLineup(id)]);
  const started = new Date() >= match.startsAt;
  const played = match.status === "played";

  return (
    <>
      <PageHeader
        backHref={`/partidos/${id}`}
        title={played ? "Corregir acta" : started ? "Acta del partido" : "Alineación"}
        eyebrow={`${match.groupName} · ${formatDateTime(match.startsAt)}`}
      />
      <ReportForm
        matchId={id}
        started={started}
        played={played}
        candidates={candidates.map((c) => ({
          userId: c.userId,
          label: fullName(c),
          nickname: c.nickname,
          confirmed: c.signupStatus === "confirmed",
        }))}
        initialLines={lineup.map((l) => ({
          userId: l.userId,
          team: l.team,
          isGoalkeeper: l.isGoalkeeper,
          goals: l.goals,
          assists: l.assists,
          saves: l.saves,
          ownGoals: l.ownGoals,
          superGoals: l.superGoals,
          superSaves: l.superSaves,
        }))}
        initialScore={played ? { A: match.scoreA ?? 0, B: match.scoreB ?? 0 } : null}
      />
    </>
  );
}
