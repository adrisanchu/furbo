"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { NicknameField } from "@/components/form/nickname-field";
import { TextField } from "@/components/form/text-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, signUpSchema, type SignUpInput } from "@/lib/validation/auth";

export function SignUpForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpInput, unknown, ReturnType<typeof signUpSchema.parse>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", nickname: "", email: "", password: "" },
  });

  async function onSubmit(values: ReturnType<typeof signUpSchema.parse>) {
    setError(null);
    const { error } = await authClient.signUp.email({
      ...values,
      name: `${values.firstName} ${values.lastName}`,
    });
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
      <div className="grid grid-cols-2 gap-3">
        <TextField control={form.control} name="firstName" label="Nombre" autoComplete="given-name" />
        <TextField control={form.control} name="lastName" label="Apellidos" autoComplete="family-name" />
      </div>
      <NicknameField control={form.control} name="nickname" />
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
        Al continuar aceptas los Términos y la Política de privacidad. Tus apellidos solo los ven los miembros de tus
        grupos.
      </p>
    </form>
  );
}
