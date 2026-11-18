import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirect";
import { requireUser } from "@/lib/session";
import type { Position } from "@/lib/validation/profile";
import { suggestNickname } from "@/lib/domain/nickname";
import { IdentityStep } from "./identity-step";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Calcula tu nivel" };

export default async function OnboardingPage({ searchParams }: PageProps<"/bienvenida">) {
  const user = await requireUser();
  const { next, repetir } = await searchParams;
  // Step 1 for magic-link sign-ups: name, surname and a unique nickname.
  if (!user.nickname) {
    const [first = "", ...rest] = (user.name ?? "").trim().split(/\s+/);
    const firstName = user.firstName ?? first;
    const lastName = user.lastName ?? rest.join(" ");
    return (
      <IdentityStep
        defaults={{ firstName, lastName, nickname: firstName ? suggestNickname(firstName, lastName) : "" }}
      />
    );
  }
  if ((user.matchesPlayed ?? 0) > 0) redirect("/perfil");
  if (user.rating != null && !repetir) redirect(safeNext(next));

  return (
    <OnboardingFlow
      firstName={user.firstName ?? user.name?.split(" ")[0] ?? ""}
      initialPosition={(user.preferredPosition as Position | undefined) ?? "any"}
      next={safeNext(next, repetir ? "/perfil" : "/inicio")}
    />
  );
}
