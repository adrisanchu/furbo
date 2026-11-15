import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "../auth-ui";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="¿Has olvidado la contraseña?"
        subtitle="Te enviamos un enlace para elegir una nueva."
      />
      <ForgotPasswordForm />
      <Link href="/entrar" className="text-center text-sm font-semibold text-muted-foreground hover:text-foreground">
        Volver a entrar
      </Link>
    </>
  );
}
