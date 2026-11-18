import { CalendarPlus, ChevronRight, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupAvatar } from "@/components/app/avatars";
import { SectionTitle } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { PLAN_LIMITS, type Plan } from "@/lib/domain/plans";
import { myGroups, ownedGroupCounts } from "@/server/queries";

export const metadata: Metadata = { title: "Crear" };

export default async function CreatePage() {
  const user = await requireUser();
  const [groups, owned] = await Promise.all([myGroups(user.id), ownedGroupCounts(user.id)]);
  const adminGroups = groups.filter((g) => g.role === "admin");
  const plan: Plan = user.plan === "premium" ? "premium" : "free";
  const limit = PLAN_LIMITS[plan];
  const ownedTotal = owned.public + owned.private;

  return (
    <>
      <h1 className="pt-2 text-[26px] font-bold tracking-[-0.02em]">¿Qué quieres crear?</h1>

      <section aria-labelledby="partido" className="flex flex-col gap-3">
        <SectionTitle id="partido">Convocar partido</SectionTitle>
        {adminGroups.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
            Solo los admins convocan partidos. Crea tu propio grupo o pide a un admin que te nombre.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {adminGroups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grupos/${g.id}/partidos/nuevo`}
                  className="flex items-center gap-3.5 rounded-2xl border bg-card p-3.5 transition-colors hover:border-subtle"
                >
                  <GroupAvatar id={g.id} name={g.name} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold">{g.name}</span>
                    <span className="text-[13px] text-muted-foreground">Nuevo partido en este grupo</span>
                  </span>
                  <CalendarPlus aria-hidden="true" className="size-5 text-accent-foreground gamer:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="grupo" className="flex flex-col gap-3">
        <SectionTitle id="grupo">Nuevo grupo</SectionTitle>
        <Link
          href="/grupos/nuevo"
          className="flex items-center gap-3.5 rounded-2xl border bg-card p-3.5 transition-colors hover:border-subtle"
        >
          <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-muted text-accent-foreground gamer:text-primary">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-semibold">Crear un grupo</span>
            <span className="text-[13px] text-muted-foreground">
              {ownedTotal >= limit.maxOwnedGroups
                ? "Has llegado al límite de grupos de tu cuenta."
                : `Serás el propietario · llevas ${ownedTotal} de ${limit.maxOwnedGroups}${plan === "free" ? " (públicos)" : ""}`}
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
        </Link>
      </section>
    </>
  );
}
