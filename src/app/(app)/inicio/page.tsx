import { CalendarPlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Inicio" };

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});

export default async function HomePage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];
  const today = dateFormat.format(new Date());

  return (
    <>
      <header className="flex flex-col gap-0.5 pt-2">
        <span className="text-[13px] text-muted-foreground first-letter:uppercase">{today}</span>
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">{firstName ? `Hola, ${firstName}` : "Hola"}</h1>
      </header>

      <section aria-labelledby="proximo" className="flex flex-col gap-3">
        <h2 id="proximo" className="text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Tu próximo partido
        </h2>
        <EmptyCard
          icon={<CalendarPlus aria-hidden="true" className="size-[22px]" />}
          title="Aún no tienes partidos"
          body="Cuando te apuntes a uno, aquí verás la hora, las plazas y cuánto te toca pagar."
        />
      </section>

      <section aria-labelledby="grupos" className="flex flex-col gap-3">
        <h2 id="grupos" className="text-lg font-bold">
          Mis grupos
        </h2>
        <EmptyCard
          icon={<UsersRound aria-hidden="true" className="size-[22px]" />}
          title="Todavía no estás en ningún grupo"
          body="Crea el de tus pachangas o únete con el enlace que te pase tu grupo."
        />
      </section>
    </>
  );
}

function EmptyCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="flex gap-3.5 rounded-2xl border border-dashed bg-card p-[18px]">
      <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-muted text-accent-foreground gamer:text-primary">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-sm leading-normal text-muted-foreground">{body}</p>
      </div>
    </article>
  );
}
