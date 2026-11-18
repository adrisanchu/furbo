"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { NicknameField } from "@/components/form/nickname-field";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { POSITION_LABEL, POSITIONS, profileSchema, type ProfileValues } from "@/lib/validation/profile";
import { updateProfile } from "@/server/actions/profile";

export function ProfileForm({
  defaults,
  email,
  nicknameLockedUntil,
}: {
  defaults: ProfileValues;
  email: string;
  /** Formatted date until which the nickname can't change (30-day rule), or null. */
  nicknameLockedUntil: string | null;
}) {
  const form = useForm<ProfileValues, unknown, ReturnType<typeof profileSchema.parse>>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: ReturnType<typeof profileSchema.parse>) {
    const result = await updateProfile(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Perfil guardado");
    form.reset(values);
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <TextField control={form.control} name="firstName" label="Nombre" autoComplete="given-name" />
        <TextField control={form.control} name="lastName" label="Apellidos" autoComplete="family-name" />
      </div>
      {nicknameLockedUntil ? (
        <Field className="gap-2">
          <FieldLabel className="text-[13px] font-semibold text-muted-foreground">Apodo</FieldLabel>
          <p className="flex h-[52px] items-center rounded-xl border bg-muted px-3.5 text-[15px]">@{defaults.nickname}</p>
          <FieldDescription className="text-[13px]">Podrás cambiarlo de nuevo el {nicknameLockedUntil}.</FieldDescription>
        </Field>
      ) : (
        <NicknameField
          control={form.control}
          name="nickname"
          current={defaults.nickname}
          description="Único. Si lo cambias, no podrás volver a hacerlo en 30 días."
        />
      )}
      <SelectField
        control={form.control}
        name="preferredPosition"
        label="Posición preferida"
        options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] }))}
      />
      <p className="text-[13px] text-muted-foreground">
        Email: {email}. Tus apellidos solo los ven los miembros de tus grupos.
      </p>
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
        {form.formState.isSubmitting && <Spinner />}
        Guardar cambios
      </Button>
    </form>
  );
}
