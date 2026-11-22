import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/app/avatars";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { buildBoards, unitLabel } from "@/lib/domain/leaderboards";
import { fullName, shortName } from "@/lib/domain/nickname";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { idSchema } from "@/server/action";
import { getMembership } from "@/server/authz";
import { groupById, playerTotals, usersByIds } from "@/server/queries";

export const metadata: Metadata = { title: "Estadísticas del grupo" };

export default async function GroupStatsPage({ params }: PageProps<"/grupos/[id]/estadisticas">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const [group, membership] = await Promise.all([groupById(id), getMembership(id, user.id)]);
  if (!group || membership?.status !== "active") notFound();

  const totals = await playerTotals({ groupId: id });
  const boards = buildBoards(totals).filter((b) => b.entries.length > 0);
  const allBoards = buildBoards(totals, 1000);
  const people = new Map((await usersByIds(totals.map((t) => t.userId))).map((u) => [u.userId, u]));

  return (
    <>
      <PageHeader backHref={`/grupos/${id}`} title="Estadísticas" eyebrow={group.name} />
      {boards.length === 0 ? (
        <EmptyState
          title="Todavía no hay estadísticas"
          body="Aparecen cuando un admin registra el acta de un partido: goles, asistencias, paradas y notas."
        />
      ) : (
        <>
          <p className="-mt-3 text-[13px] text-muted-foreground">
            Todos los partidos con acta del grupo · {totals.length} {totals.length === 1 ? "jugador" : "jugadores"}.
          </p>
          <div className="flex flex-col gap-3">
            {boards.map((board) => {
              const myRank = allBoards.find((b) => b.key === board.key)!.entries.findIndex((e) => e.userId === user.id);
              const myEntry = myRank >= 0 ? allBoards.find((b) => b.key === board.key)!.entries[myRank] : null;
              const inTop = board.entries.some((e) => e.userId === user.id);
              return (
                <section key={board.key} aria-labelledby={`board-${board.key}`} className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4">
                  <div className="flex flex-col">
                    <h2 id={`board-${board.key}`} className="text-[17px] font-bold">
                      {board.title}
                    </h2>
                    <span className="text-[13px] text-muted-foreground">{board.description}</span>
                  </div>
                  <ol className="flex flex-col gap-2">
                    {board.entries.map((e, k) => (
                      <Row
                        key={e.userId}
                        rank={k + 1}
                        userId={e.userId}
                        me={e.userId === user.id}
                        name={people.get(e.userId)}
                        value={e.display}
                        unit={unitLabel(board.unit, e.value)}
                      />
                    ))}
                    {!inTop && myEntry && (
                      <>
                        <li aria-hidden="true" className="pl-8 text-xs text-subtle">
                          ···
                        </li>
                        <Row
                          rank={myRank + 1}
                          userId={user.id}
                          me
                          name={people.get(user.id)}
                          value={myEntry.display}
                          unit={unitLabel(board.unit, myEntry.value)}
                        />
                      </>
                    )}
                  </ol>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function Row({
  rank,
  userId,
  me,
  name,
  value,
  unit,
}: {
  rank: number;
  userId: string;
  me: boolean;
  name: { name: string; firstName: string | null; lastName: string | null; nickname: string | null } | undefined;
  value: string;
  unit: string;
}) {
  const label = name ? fullName(name) : "Jugador";
  return (
    <li className={cn("flex items-center gap-2.5 rounded-xl px-1.5 py-1", me && "bg-primary/10")}>
      <span
        className={cn(
          "w-5 text-center font-display text-lg font-bold tabular-nums",
          rank === 1 ? "text-warning" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <PlayerAvatar id={userId} name={label} highlight={me} className="size-8" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{me ? "Tú" : name ? shortName(name) : label}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-xl font-bold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </span>
    </li>
  );
}
