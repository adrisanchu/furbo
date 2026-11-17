"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FORMAT_LABEL } from "@/lib/domain/matches";
import { cn } from "@/lib/utils";
import { groupFormSchema, type GroupFormValues } from "@/lib/validation/group";
import { createGroup, updateGroup } from "@/server/actions/groups";

export function GroupForm({ groupId, defaults }: { groupId?: string; defaults: GroupFormValues }) {
  const router = useRouter();
  const form = useForm<GroupFormValues>({ resolver: zodResolver(groupFormSchema), defaultValues: defaults });

  async function onSubmit(values: GroupFormValues) {
    if (groupId) {
      const result = await updateGroup(groupId, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Grupo guardado");
      if (!result.data.located) toast.warning("No hemos encontrado la base en el mapa. Prueba con una dirección más concreta.");
      router.push(`/grupos/${groupId}`);
      return;
    }
    const result = await createGroup(values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("¡Grupo creado! Ahora invita a tu gente.");
    if (!result.data.located) toast.warning("No hemos encontrado la base en el mapa. Puedes editarla después.");
    router.push(`/grupos/${result.data.id}`);
  }

  const pending = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <TextField control={form.control} name="name" label="Nombre del grupo" placeholder="Los del Jueves" />

      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor="description" className="text-[13px] font-semibold text-muted-foreground">
              Descripción (opcional)
            </FieldLabel>
            <Textarea
              {...field}
              id="description"
              rows={3}
              placeholder="Cuándo jugáis, qué nivel buscáis…"
              className="rounded-xl bg-card px-3.5 py-3 text-[15px] md:text-[15px] dark:bg-card"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="visibility"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">Visibilidad</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ["private", "Privado", "Solo con invitación"],
                  ["public", "Público", "Aparece en el buscador"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-0.5 rounded-xl border bg-card px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    field.value === value && "border-primary bg-primary/10",
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={field.value === value}
                    onChange={() => field.onChange(value)}
                    className="sr-only"
                  />
                  <span className="text-[15px] font-semibold">{label}</span>
                  <span className="text-[13px] text-muted-foreground">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />

      <div className="flex flex-col gap-1.5">
        <TextField
          control={form.control}
          name="baseLabel"
          label="Base (dónde soléis jugar)"
          placeholder="Polideportivo La Elipa, Madrid"
          autoComplete="off"
        />
        <FieldDescription className="text-[13px]">
          Buscamos la ubicación en OpenStreetMap. Se guarda la del grupo, nunca la tuya.
        </FieldDescription>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          control={form.control}
          name="referenceRating"
          label="Nivel de referencia"
          inputMode="decimal"
          placeholder="5.0"
        />
        <SelectField
          control={form.control}
          name="defaultFormat"
          label="Formato habitual"
          options={Object.entries(FORMAT_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <FieldDescription className="-mt-3 text-[13px]">
        El nivel de referencia (1.0–10.0) se usa hasta que haya partidos jugados; después se calcula con los miembros.
      </FieldDescription>

      <TextField
        control={form.control}
        name="defaultCourtPrice"
        label="Precio habitual de la pista (€, opcional)"
        inputMode="decimal"
        placeholder="50"
      />
      <TextField
        control={form.control}
        name="whatsappUrl"
        label="Enlace al grupo de WhatsApp (opcional)"
        inputMode="url"
        placeholder="https://chat.whatsapp.com/…"
      />

      <Button type="submit" size="xl" disabled={pending} className="mt-2">
        {pending && <Spinner />}
        {groupId ? "Guardar cambios" : "Crear grupo"}
      </Button>
    </form>
  );
}
