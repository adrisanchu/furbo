import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MatchCard } from "@/components/app/match-card";
import { EmptyState, SectionTitle } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { upcomingMatchesForUser } from "@/server/queries";

export const metadata: Metadata = { title: "Partidos" };

export default async function MatchesPage() {
  const user = await requireUser();
  const matches = await upcomingMatchesForUser(user.id);
  const mine = matches.filter((m) => m.myStatus === "confirmed" || m.myStatus === "waitlist");
  const others = matches.filter((m) => m.myStatus !== "confirmed" && m.myStatus !== "waitlist");

  return (
    <>
      <h1 className="pt-2 text-[26px] font-bold tracking-[-0.02em]">Partidos</h1>

      <section aria-labelledby="mios" className="flex flex-col gap-3">
        <SectionTitle id="mios">Te has apuntado</SectionTitle>
        {mine.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus aria-hidden="true" className="size-[22px]" />}
            title="No estás apuntado a ningún partido"
            body="Apúntate a uno de tus grupos y aquí verás la hora, las plazas y tu parte."
          />
        ) : (
          mine.map((m) => <MatchCard key={m.id} match={m} />)
        )}
      </section>

      <section aria-labelledby="otros" className="flex flex-col gap-3">
        <SectionTitle id="otros">En tus grupos</SectionTitle>
        {others.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            No hay más partidos convocados en tus grupos.
          </p>
        ) : (
          others.map((m) => <MatchCard key={m.id} match={m} />)
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/crear">Convocar un partido</Link>
        </Button>
      </section>
    </>
  );
}
