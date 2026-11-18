"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NicknameField } from "@/components/form/nickname-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { identitySchema, type IdentityValues } from "@/lib/validation/profile";
import { completeIdentity } from "@/server/actions/profile";

/** First onboarding step for accounts without a nickname (e.g. magic-link sign-ups). */
export function IdentityStep({ defaults }: { defaults: IdentityValues }) {
  const router = useRouter();
  const form = useForm<IdentityValues, unknown, ReturnType<typeof identitySchema.parse>>({
    resolver: zodResolver(identitySchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: ReturnType<typeof identitySchema.parse>) {
    const result = await completeIdentity(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Hola, @${result.data.nickname}`);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">Tu perfil de jugador</h1>
        <p className="text-[15px] text-muted-foreground">
          Tu apodo es único: así te encontrarán otros jugadores. Luego calculamos tu nivel.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField control={form.control} name="firstName" label="Nombre" autoComplete="given-name" />
        <TextField control={form.control} name="lastName" label="Apellidos" autoComplete="family-name" />
      </div>
      <NicknameField control={form.control} name="nickname" />
      <Button type="submit" size="xl" className="mt-auto" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Spinner />}
        Continuar
      </Button>
    </form>
  );
}
