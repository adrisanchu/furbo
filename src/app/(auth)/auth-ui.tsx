import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
      <p className="text-[15px] leading-normal text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Segmented control between sign-up and sign-in (two routes, not client tabs). */
export function AuthSwitch({ active, next }: { active: "registro" | "entrar"; next?: string }) {
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  const item = (key: "registro" | "entrar", label: string) => (
    <Link
      href={`/${key}${qs}`}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "flex h-11 items-center justify-center rounded-[10px] text-sm font-semibold transition-colors",
        active === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Acceso" className="grid grid-cols-2 rounded-xl border bg-card p-1">
      {item("registro", "Crear cuenta")}
      {item("entrar", "Entrar")}
    </nav>
  );
}

export function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
