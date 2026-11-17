import { Lock, Plus, Search, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/app/action-button";
import { GroupAvatar } from "@/components/app/avatars";
import { EmptyState, SectionTitle } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatLevel } from "@/lib/domain/level";
import { requireUser } from "@/lib/session";
import { joinPublicGroup } from "@/server/actions/groups";
import { myGroups, publicGroups } from "@/server/queries";

export const metadata: Metadata = { title: "Grupos" };

export default async function GroupsPage({ searchParams }: PageProps<"/grupos">) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [mine, discover] = await Promise.all([myGroups(user.id), publicGroups(user.id, query)]);
  const toJoin = discover.filter((g) => g.myStatus !== "active");

  return (
    <>
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">Grupos</h1>
        <Button asChild size="lg">
          <Link href="/grupos/nuevo">
            <Plus aria-hidden="true" />
            Crear grupo
          </Link>
        </Button>
      </header>

      <section aria-labelledby="mis-grupos" className="flex flex-col gap-3">
        <SectionTitle id="mis-grupos">Mis grupos</SectionTitle>
        {mine.length === 0 ? (
          <EmptyState
            icon={<UsersRound aria-hidden="true" className="size-[22px]" />}
            title="Todavía no estás en ningún grupo"
            body="Crea el de tus pachangas, únete a uno público o abre el enlace de invitación que te pasen."
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {mine.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grupos/${g.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border bg-card p-3.5 transition-colors hover:border-subtle"
                >
                  <GroupAvatar id={g.id} name={g.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{g.name}</span>
                      {g.role === "admin" && (
                        <span className="flex-none rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Admin
                        </span>
                      )}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {g.membersCount} {g.membersCount === 1 ? "miembro" : "miembros"} · {g.baseLabel}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-display text-2xl leading-none font-bold">{formatLevel(g.level)}</span>
                    <span className="text-[11px] text-muted-foreground">nivel</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="descubrir" className="flex flex-col gap-3">
        <SectionTitle id="descubrir">Grupos públicos</SectionTitle>
        <form role="search" className="relative">
          <label htmlFor="buscar" className="sr-only">
            Buscar grupos
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            id="buscar"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nombre, campo o barrio"
            className="h-[52px] w-full rounded-xl border bg-card pr-3.5 pl-11 text-[15px] outline-none placeholder:text-subtle focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>
        <p className="text-[13px] text-muted-foreground">
          La búsqueda por cercanía y el mapa llegan pronto. De momento, busca por nombre o zona.
        </p>
        {toJoin.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-[18px] text-sm text-muted-foreground">
            {query ? `No hay grupos públicos que coincidan con «${query}».` : "No hay más grupos públicos por ahora."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {toJoin.map((g) => (
              <li key={g.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-3.5">
                <Link href={`/grupos/${g.id}`} className="flex items-center gap-3.5">
                  <GroupAvatar id={g.id} name={g.name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{g.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {g.membersCount} {g.membersCount === 1 ? "miembro" : "miembros"} · {g.baseLabel}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-display text-2xl leading-none font-bold">{formatLevel(g.level)}</span>
                    <span className="text-[11px] text-muted-foreground">nivel medio</span>
                  </span>
                </Link>
                {g.myStatus === "banned" ? (
                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Lock aria-hidden="true" className="size-3.5" /> No puedes unirte a este grupo
                  </span>
                ) : (
                  <ActionButton
                    variant="outline"
                    size="lg"
                    className="border-primary text-accent-foreground gamer:text-primary"
                    action={joinPublicGroup.bind(null, g.id)}
                    success={`Ya eres de «${g.name}»`}
                    redirectTo={`/grupos/${g.id}`}
                  >
                    Unirme
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
