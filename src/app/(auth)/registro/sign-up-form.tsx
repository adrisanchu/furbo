"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, signUpSchema, type SignUpInput } from "@/lib/validation/auth";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    setError(null);
    const { error } = await authClient.signUp.email(values);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const pending = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField
        control={form.control}
        name="name"
        label="Nombre"
        autoComplete="name"
        placeholder="Cómo te llaman en el campo"
      />
      <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" inputMode="email" />
      <TextField
        control={form.control}
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="xl" disabled={pending} className="mt-2">
        {pending && <Spinner />}
        Crear cuenta
      </Button>
      <p className="text-center text-xs leading-normal text-muted-foreground">
        Al continuar aceptas los Términos y la Política de privacidad.
      </p>
    </form>
  );
}
