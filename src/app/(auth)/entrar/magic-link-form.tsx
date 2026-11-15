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

export function MagicLinkForm({ next }: { next: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: EmailOnlyInput) {
    setError(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: next,
      errorCallbackURL: "/entrar?error=link",
    });
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <Alert>
        <MailCheck />
        <AlertTitle>Revisa tu correo</AlertTitle>
        <AlertDescription>
          Te hemos enviado un enlace a {sentTo}. Caduca en 15 minutos y solo sirve una vez.
        </AlertDescription>
      </Alert>
    );
  }

  const pending = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextField
        control={form.control}
        name="email"
        id="magic-link-email"
        label="Email para el enlace"
        type="email"
        autoComplete="email"
        inputMode="email"
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="xl" variant="outline" disabled={pending} className="h-[52px] text-[15px]">
        {pending && <Spinner />}
        Enviarme un enlace mágico
      </Button>
    </form>
  );
}
