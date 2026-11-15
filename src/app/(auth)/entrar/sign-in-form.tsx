"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form/text-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, signInSchema, type SignInInput } from "@/lib/validation/auth";

export function SignInForm({ next, linkError }: { next: string; linkError?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    linkError ? "El enlace no es válido o ha caducado. Pide uno nuevo." : null,
  );
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    setError(null);
    const { error } = await authClient.signIn.email(values);
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
      <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" inputMode="email" />
      <TextField
        control={form.control}
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        labelAside={
          <Link href="/recuperar" className="text-[13px] font-semibold text-accent-foreground gamer:text-primary">
            ¿La has olvidado?
          </Link>
        }
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="xl" disabled={pending} className="mt-2">
        {pending && <Spinner />}
        Entrar
      </Button>
    </form>
  );
}
