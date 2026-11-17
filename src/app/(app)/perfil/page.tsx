import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { initials } from "@/components/app/avatars";
import { LevelIndicator } from "@/components/app/level-indicator";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { POSITION_LABEL, type Position } from "@/lib/validation/profile";
import { myGroups } from "@/server/queries";
import { ProfileForm } from "./profile-form";
import { SignOutButton } from "./sign-out-button";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Perfil" };

const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric", timeZone: "Europe/Madrid" });

export default async function ProfilePage() {
  const user = await requireUser();
  const groups = await myGroups(user.id);
  const position = (user.preferredPosition ?? "any") as Position;
  const matchesPlayed = user.matchesPlayed ?? 0;

  return (
    <>
      <header className="flex items-center gap-4 pt-2">
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-muted text-xl font-bold text-accent-foreground gamer:text-primary">
          {initials(user.name, user.email[0]?.toUpperCase())}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-[26px] font-bold tracking-[-0.02em]">{user.name || "Sin nombre"}</h1>
          <span className="text-[13px] text-muted-foreground">
            {POSITION_LABEL[position]} · {groups.length} {groups.length === 1 ? "grupo" : "grupos"} · desde{" "}
            {monthFmt.format(new Date(user.createdAt))}
          </span>
        </div>
      </header>

      <LevelIndicator
        rating={user.rating ?? null}
        provisional={user.ratingProvisional ?? true}
        matchesPlayed={matchesPlayed}
      />

      {matchesPlayed === 0 && (
        <Button asChild variant="outline" size="lg">
          <Link href="/bienvenida?repetir=1">
            <RotateCcw aria-hidden="true" />
            Repetir la autoevaluación
          </Link>
        </Button>
      )}

      <section aria-labelledby="datos" className="flex flex-col gap-3">
        <h2 id="datos" className="text-lg font-bold">
          Tus datos
        </h2>
        <ProfileForm defaults={{ name: user.name ?? "", preferredPosition: position }} email={user.email} />
      </section>

      <ThemePicker saved={user.theme ?? "system"} />

      <SignOutButton />
    </>
  );
}
