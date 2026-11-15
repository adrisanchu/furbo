import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Tu grupo, tus partidos",
    body: "Grupos públicos o privados con su base y su nivel medio. Comparte el enlace y la gente se apunta sola.",
    demo: (
      <div className="flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
        <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#2b2740] text-xs font-bold text-[#cfc4ff]">
          PD
        </span>
        <span className="flex-1 text-sm font-semibold">Pachanga del domingo</span>
        <span className="font-display text-xl font-bold">7/10</span>
      </div>
    ),
  },
  {
    n: "02",
    title: "La pista se reparte sola",
    body: "El precio por jugador baja en vivo con cada apuntado. Al cerrar, queda fijado y el admin marca quién ha pagado.",
    demo: (
      <div className="flex items-baseline justify-between rounded-xl bg-muted p-3">
        <span className="text-[13px] text-muted-foreground">50 € ÷ 8 jugadores</span>
        <span className="font-display text-[32px] leading-none font-bold">6,25 €</span>
      </div>
    ),
  },
  {
    n: "03",
    title: "Un nivel que se ajusta",
    body: "Empiezas con una autoevaluación rápida y tu nivel se ajusta con cada resultado. Equipos más igualados, partidos mejores.",
    demo: (
      <div className="flex items-center justify-between rounded-xl bg-muted p-3">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[32px] leading-none font-bold">6.4</span>
          <span className="text-[13px] text-muted-foreground">tu nivel</span>
        </span>
        <span className="font-display text-[22px] font-bold text-level-up">+0.12</span>
      </div>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-14 px-5 pt-4 pb-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Button asChild variant="outline" className="h-11 rounded-full px-4 text-sm font-semibold">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </header>

      <section aria-labelledby="hero" className="flex flex-col items-center text-center">
        <HeroGoal />
        <h1
          id="hero"
          className="-mt-2 font-display text-[136px] leading-[0.82] font-extrabold tracking-[0.01em]"
        >
          FURBO
        </h1>
        <p className="mt-[18px] max-w-[320px] text-[22px] leading-[1.3] font-semibold tracking-[-0.01em]">
          El partido con tus amigos, <span className="text-accent-foreground gamer:text-primary">organizado en un minuto.</span>
        </p>
        <p className="mt-3 max-w-[320px] text-[15px] leading-[1.55] text-muted-foreground">
          Crea tu grupo, convoca partido y deja que Furbo reparta la pista y equilibre los equipos por nivel.
        </p>
        <div className="mt-7 flex w-full flex-col gap-3">
          <Button asChild size="xl" className="halo">
            <Link href="/registro">Crear cuenta gratis</Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="h-[52px] text-[15px] font-semibold">
            <Link href="/entrar">Ya tengo cuenta</Link>
          </Button>
        </div>
        <span className="mt-3.5 text-[13px] text-muted-foreground">
          Fútbol 5, 7 y 11 · Sin descargas: instálala desde el navegador
        </span>
      </section>

      <section aria-labelledby="como" className="flex flex-col gap-3.5">
        <h2
          id="como"
          className="mb-1 text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
        >
          Cómo funciona
        </h2>
        {steps.map((step) => (
          <article key={step.n} className="flex flex-col gap-3 rounded-2xl border bg-card p-[18px]">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-[28px] leading-none font-bold text-accent-foreground gamer:text-primary">
                {step.n}
              </span>
              <h3 className="text-[17px] font-bold">{step.title}</h3>
            </div>
            <p className="text-sm leading-normal text-muted-foreground">{step.body}</p>
            {step.demo}
          </article>
        ))}
      </section>

      <section className="flex flex-col items-center gap-4 py-2 text-center">
        <h2 className="font-display text-[44px] leading-[0.95] font-bold">
          ¿JUGAMOS
          <br />
          ESTE JUEVES?
        </h2>
        <Button
          asChild
          size="xl"
          variant="outline"
          className="w-full border-primary text-accent-foreground gamer:text-primary"
        >
          <Link href="/registro">Empezar ahora</Link>
        </Button>
      </section>

      <footer className="mt-auto flex justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>© 2026 Furbo</span>
        <span className="flex gap-4">
          <span>Privacidad</span>
          <span>Términos</span>
        </span>
      </footer>
    </div>
  );
}

function HeroGoal() {
  return (
    <svg
      role="img"
      aria-label="Portería de fútbol dibujada con líneas de neón"
      viewBox="0 0 350 250"
      className="w-full max-w-[350px]"
      style={{
        filter:
          "drop-shadow(0 0 4px rgb(var(--glow-color) / 0.9)) drop-shadow(0 0 22px rgb(var(--glow-color) / 0.55))",
      }}
    >
      <g stroke="var(--primary)" strokeOpacity="0.28" strokeWidth="1">
        <path d="M90 68h170M86 92h178M82 116h186M78 140h194M74 164h202" />
        <path d="M115 60v122M145 60v122M175 60v122M205 60v122M235 60v122" />
        <path d="M60 40 95 60M290 40 255 60M60 40 70 182M290 40 280 182" />
        <path d="M44 70l38 0M44 100l36 0M44 130l32 0M306 70l-38 0M306 100l-36 0M306 130l-32 0" />
      </g>
      <path d="M95 60h160v122H95z" fill="none" stroke="var(--primary)" strokeOpacity="0.5" strokeWidth="1.5" />
      <path
        d="M30 192V40h290v152"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 40 95 60M320 40 255 60M30 192 95 182M320 192 255 182"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeOpacity="0.7"
        strokeLinecap="round"
      />
      <path d="M4 196h342" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M60 196 30 246M290 196l30 50"
        stroke="var(--foreground)"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="214" cy="164" r="13" fill="var(--background)" stroke="var(--foreground)" strokeWidth="2.2" />
      <path d="m214 157 6 4-2 7h-8l-2-7z" fill="var(--foreground)" />
    </svg>
  );
}
