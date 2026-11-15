"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, emailOnlySchema, type EmailOnlyInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: EmailOnlyInput) {
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/restablecer" });
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert>
        <MailCheck />
        <AlertTitle>Revisa tu correo</AlertTitle>
        <AlertDescription>
          Si hay una cuenta con ese email, te llegará un enlace para cambiar la contraseña. Caduca en 1 hora.
        </AlertDescription>
      </Alert>
    );
  }

  const pending = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" inputMode="email" />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="xl" disabled={pending}>
        {pending && <Spinner />}
        Enviar enlace
      </Button>
    </form>
  );
}
