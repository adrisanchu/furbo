import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirect";
import { requireUser } from "@/lib/session";
import type { Position } from "@/lib/validation/profile";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Calcula tu nivel" };

export default async function OnboardingPage({ searchParams }: PageProps<"/bienvenida">) {
  const user = await requireUser();
  const { next, repetir } = await searchParams;
  if ((user.matchesPlayed ?? 0) > 0) redirect("/perfil");
  if (user.rating != null && !repetir) redirect(safeNext(next));

  return (
    <OnboardingFlow
      firstName={user.name?.split(" ")[0] ?? ""}
      initialPosition={(user.preferredPosition as Position | undefined) ?? "any"}
      next={safeNext(next, repetir ? "/perfil" : "/inicio")}
    />
  );
}
