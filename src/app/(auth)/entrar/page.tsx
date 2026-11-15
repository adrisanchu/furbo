import type { Metadata } from "next";
import { AuthHeading, AuthSwitch, OrDivider } from "../auth-ui";
import { safeNext } from "@/lib/redirect";
import { MagicLinkForm } from "./magic-link-form";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);
  return (
    <>
      <AuthHeading title="Bienvenido de vuelta" subtitle="Entra para ver tus partidos y grupos." />
      <AuthSwitch active="entrar" next={destination === "/inicio" ? undefined : destination} />
      <SignInForm next={destination} linkError={typeof error === "string" ? error : undefined} />
      <OrDivider>o entra sin contraseña</OrDivider>
      <MagicLinkForm next={destination} />
    </>
  );
}
