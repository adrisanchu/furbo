import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Perfil" };

function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <header className="flex items-center gap-4 pt-2">
        <span className="flex size-16 flex-none items-center justify-center rounded-full bg-muted text-xl font-bold text-accent-foreground gamer:text-primary">
          {initials(user.name, user.email)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-[26px] font-bold tracking-[-0.02em]">{user.name || "Sin nombre"}</h1>
          <span className="truncate text-sm text-muted-foreground">{user.email}</span>
        </div>
      </header>

      <p className="rounded-2xl border border-dashed bg-card p-[18px] text-sm leading-normal text-muted-foreground">
        Muy pronto: tu posición preferida, la autoevaluación de nivel y tu historial.
      </p>

      <ThemePicker saved={user.theme ?? "system"} />

      <SignOutButton />
    </>
  );
}
