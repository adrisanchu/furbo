"use client";

import { CircleUserRound, House, Plus, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/inicio", label: "Inicio", icon: House },
  { href: "/grupos", label: "Grupos", icon: UsersRound },
  null, // primary action slot
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: CircleUserRound },
] as const;

/** Mobile bottom navigation: 4 tabs + highlighted "Crear" action (PRD §6.1). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid h-[88px] max-w-md grid-cols-5 items-start px-2 pt-2">
        {tabs.map((tab) => {
          if (!tab) {
            return (
              <div key="crear" className="-mt-[26px] flex flex-col items-center gap-1">
                <Link
                  href="/crear"
                  aria-label="Crear grupo o partido"
                  className="flex size-[60px] items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_10px_32px_-6px_rgb(var(--glow-color)/0.6)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Plus aria-hidden="true" className="size-[26px]" strokeWidth={2.4} />
                </Link>
                <span aria-hidden="true" className="text-[11px] font-semibold">
                  Crear
                </span>
              </div>
            );
          }
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
                active ? "font-semibold text-accent-foreground gamer:text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-[22px]" strokeWidth={1.8} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
