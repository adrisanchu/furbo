import type { Metadata } from "next";
import { AuthHeading, AuthSwitch } from "../auth-ui";
import { safeNext } from "@/lib/redirect";
import { redirectIfSignedIn } from "@/lib/session";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/registro">) {
  const { next } = await searchParams;
  const destination = safeNext(next);
  await redirectIfSignedIn(destination);
  return (
    <>
      <AuthHeading title="Crea tu cuenta" subtitle="Un minuto y estás dentro. Después calculamos tu nivel." />
      <AuthSwitch active="registro" next={destination === "/inicio" ? undefined : destination} />
      <SignUpForm next={destination} />
    </>
  );
}
