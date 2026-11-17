"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { defaultMinPlayers, FORMAT_LABEL, FORMAT_PLAYERS, type MatchFormat } from "@/lib/domain/matches";
import { matchFormSchema, type MatchFormValues } from "@/lib/validation/match";
import { createMatch, updateMatch } from "@/server/actions/matches";

export function MatchForm({
  groupId,
  matchId,
  defaults,
  baseLabel,
  closed,
}: {
  groupId: string;
  matchId?: string;
  defaults: MatchFormValues;
  baseLabel: string;
  /** Closed matches only allow changing time and place. */
  closed?: boolean;
}) {
  const router = useRouter();
  const form = useForm<MatchFormValues>({ resolver: zodResolver(matchFormSchema), defaultValues: defaults });

  async function onSubmit(values: MatchFormValues) {
    if (matchId) {
      const result = await updateMatch(matchId, values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Partido actualizado");
      router.push(`/partidos/${matchId}`);
      return;
    }
    const result = await createMatch(groupId, values);
    if (!result.ok) return void toast.error(result.error);
    toast.success("¡Partido convocado!");
    router.push(`/partidos/${result.data.id}`);
  }

  const pending = form.formState.isSubmitting;
  const dateInput = "[color-scheme:inherit] [&::-webkit-calendar-picker-indicator]:opacity-70";

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField control={form.control} name="startsAt" label="Día y hora" type="datetime-local" className={dateInput} />
        <TextField
          control={form.control}
          name="durationMin"
          label="Minutos"
          inputMode="numeric"
          className="w-24"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <TextField
          control={form.control}
          name="locationLabel"
          label="Lugar"
          placeholder={baseLabel}
          autoComplete="off"
        />
        <FieldDescription className="text-[13px]">Déjalo vacío para jugar en la base del grupo.</FieldDescription>
      </div>

      {closed ? (
        <p className="rounded-xl border border-dashed p-3.5 text-[13px] text-muted-foreground">
          La inscripción está cerrada y las partes ya están fijadas: solo puedes cambiar la fecha, la duración o el lugar.
        </p>
      ) : (
        <>
          <SelectField
            control={form.control}
            name="format"
            label="Formato"
            options={Object.entries(FORMAT_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField control={form.control} name="maxPlayers" label="Plazas" inputMode="numeric" />
            <TextField control={form.control} name="minPlayers" label="Mínimo para jugar" inputMode="numeric" />
          </div>
          <button
            type="button"
            className="-mt-3 self-start text-[13px] font-semibold text-accent-foreground gamer:text-primary"
            onClick={() => {
              const max = FORMAT_PLAYERS[form.getValues("format") as MatchFormat];
              form.setValue("maxPlayers", String(max), { shouldDirty: true });
              form.setValue("minPlayers", String(defaultMinPlayers(max)), { shouldDirty: true });
            }}
          >
            Usar plazas típicas del formato
          </button>
          <div className="flex flex-col gap-1.5">
            <TextField control={form.control} name="courtPrice" label="Precio total de la pista (€)" inputMode="decimal" />
            <FieldDescription className="text-[13px]">
              Se reparte entre los apuntados y queda fijado al cerrar la inscripción.
            </FieldDescription>
          </div>
          <TextField
            control={form.control}
            name="signupDeadline"
            label="Cierre de inscripción"
            type="datetime-local"
            className={dateInput}
          />
        </>
      )}

      <Button type="submit" size="xl" disabled={pending} className="mt-2">
        {pending && <Spinner />}
        {matchId ? "Guardar cambios" : "Convocar partido"}
      </Button>
    </form>
  );
}
