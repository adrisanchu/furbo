import type { Metadata } from "next";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthHeading } from "../auth-ui";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/restablecer">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return (
    <>
      <AuthHeading title="Elige una contraseña nueva" subtitle="Cerraremos tus sesiones abiertas por seguridad." />
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <Alert variant="destructive">
            <AlertDescription>El enlace no es válido o ha caducado.</AlertDescription>
          </Alert>
          <Link href="/recuperar" className="text-center text-sm font-semibold text-accent-foreground gamer:text-primary">
            Pedir un enlace nuevo
          </Link>
        </>
      )}
    </>
  );
}
