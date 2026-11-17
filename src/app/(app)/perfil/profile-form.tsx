"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { POSITION_LABEL, POSITIONS, profileSchema, type ProfileValues } from "@/lib/validation/profile";
import { updateProfile } from "@/server/actions/profile";

export function ProfileForm({ defaults, email }: { defaults: ProfileValues; email: string }) {
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: defaults });

  async function onSubmit(values: ProfileValues) {
    const result = await updateProfile(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Perfil guardado");
    form.reset(values);
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField control={form.control} name="name" label="Nombre visible" autoComplete="name" />
      <SelectField
        control={form.control}
        name="preferredPosition"
        label="Posición preferida"
        options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] }))}
      />
      <p className="text-[13px] text-muted-foreground">Email: {email}</p>
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
        {form.formState.isSubmitting && <Spinner />}
        Guardar cambios
      </Button>
    </form>
  );
}
