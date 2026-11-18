"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { applyAdjustment, MAX_ADJUSTMENT, PROVISIONAL_MATCHES, SELF_ASSESSMENT, suggestRating } from "@/lib/domain/level";
import { cn } from "@/lib/utils";
import { POSITION_LABEL, POSITIONS, type Position } from "@/lib/validation/profile";
import { completeOnboarding } from "@/server/actions/profile";

const TOTAL_STEPS = SELF_ASSESSMENT.length + 2; // position + questions + result

/** Self-assessment (PRD §5.5): position, 5 questions, suggested level ±1.0. */
export function OnboardingFlow({
  firstName,
  initialPosition,
  next,
}: {
  firstName: string;
  initialPosition: Position;
  next: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState<Position>(initialPosition);
  const [answers, setAnswers] = useState<(number | null)[]>(SELF_ASSESSMENT.map(() => null));
  const [adjustment, setAdjustment] = useState(0);
  const [pending, startTransition] = useTransition();

  const questionIndex = step - 1;
  const isResult = step === TOTAL_STEPS - 1;
  const canContinue = step === 0 || isResult || answers[questionIndex] != null;
  const complete = answers.every((a) => a != null);
  const suggested = complete ? suggestRating(answers as number[]) : null;
  const level = suggested != null ? applyAdjustment(suggested, adjustment) : null;

  function adjust(delta: number) {
    setAdjustment((a) => Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Math.round((a + delta) * 10) / 10)));
  }

  function submit() {
    startTransition(async () => {
      const result = await completeOnboarding({
        preferredPosition: position,
        answers: answers as number[],
        adjustment,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Nivel guardado: ${result.data.rating.toFixed(1)}`);
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div
        role="progressbar"
        aria-label="Progreso"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step + 1}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${TOTAL_STEPS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, k) => (
          <span key={k} className={cn("h-1 rounded-full", k <= step ? "bg-primary" : "bg-border")} />
        ))}
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-5" aria-labelledby="posicion">
          <div className="flex flex-col gap-1.5">
            <h1 id="posicion" className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {firstName ? `${firstName}, ¿dónde` : "¿Dónde"} sueles jugar?
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Luego 5 preguntas rápidas y te proponemos un nivel para empezar.
            </p>
          </div>
          <OptionList
            label="Posición preferida"
            options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABEL[p] }))}
            value={position}
            onChange={(v) => setPosition(v as Position)}
          />
        </section>
      )}

      {questionIndex >= 0 && questionIndex < SELF_ASSESSMENT.length && (
        <section className="flex flex-col gap-5" aria-live="polite">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold tracking-[0.06em] text-accent-foreground uppercase gamer:text-primary">
              Pregunta {questionIndex + 1} de {SELF_ASSESSMENT.length} · {SELF_ASSESSMENT[questionIndex]!.tag}
            </span>
            <h1 className="text-[22px] leading-snug font-semibold">{SELF_ASSESSMENT[questionIndex]!.text}</h1>
          </div>
          <OptionList
            label={SELF_ASSESSMENT[questionIndex]!.text}
            options={SELF_ASSESSMENT[questionIndex]!.options.map((label, k) => ({ value: String(k), label }))}
            value={answers[questionIndex] == null ? null : String(answers[questionIndex])}
            onChange={(v) =>
              setAnswers((prev) => prev.map((a, k) => (k === questionIndex ? Number(v) : a)))
            }
          />
        </section>
      )}

      {isResult && level != null && suggested != null && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">Tu nivel sugerido</h1>
            <p className="text-[15px] text-muted-foreground">
              Según tus respuestas. Ajústalo si crees que te pasas o te quedas corto.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-6 halo">
            <span aria-live="polite" className="font-display text-[88px] leading-[0.9] font-bold">
              {level.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              {adjustment === 0
                ? "sin ajustar"
                : `${adjustment > 0 ? "+" : "−"}${Math.abs(adjustment).toFixed(1)} sobre ${suggested.toFixed(1)}`}
            </span>
            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-warning">
              PROVISIONAL HASTA {PROVISIONAL_MATCHES} PARTIDOS
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ajuste" className="flex justify-between text-[13px] font-semibold text-muted-foreground">
              Ajuste fino <span>±{MAX_ADJUSTMENT.toFixed(1)}</span>
            </label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon-lg" aria-label="Bajar 0,1" onClick={() => adjust(-0.1)}>
                <Minus />
              </Button>
              <input
                id="ajuste"
                type="range"
                min={-MAX_ADJUSTMENT}
                max={MAX_ADJUSTMENT}
                step={0.1}
                value={adjustment}
                onChange={(e) => setAdjustment(Math.round(Number(e.target.value) * 10) / 10)}
                className="h-11 flex-1 accent-primary"
              />
              <Button type="button" variant="outline" size="icon-lg" aria-label="Subir 0,1" onClick={() => adjust(0.1)}>
                <Plus />
              </Button>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Tus respuestas">
            {SELF_ASSESSMENT.map((q, k) => (
              <li key={q.tag} className="rounded-full bg-muted px-3 py-1.5 text-[13px] text-muted-foreground">
                {q.short} · {q.options[answers[k]!]!.toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="h-[52px] text-[15px]"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => s - 1)}
        >
          Atrás
        </Button>
        {isResult ? (
          <Button type="button" size="xl" className="h-[52px] text-[15px]" disabled={pending} onClick={submit}>
            {pending && <Spinner />}
            Empezar a jugar
          </Button>
        ) : (
          <Button
            type="button"
            size="xl"
            className="h-[52px] text-[15px]"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
          >
            {step === TOTAL_STEPS - 2 ? "Ver mi nivel" : "Siguiente"}
          </Button>
        )}
      </footer>
    </div>
  );
}

function OptionList({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-[15px] font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              selected && "border-primary bg-primary/10",
            )}
          >
            <input
              type="radio"
              name={label}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                "flex size-[22px] flex-none items-center justify-center rounded-full border-2",
                selected ? "border-primary" : "border-subtle",
              )}
            >
              {selected && <span className="size-2.5 rounded-full bg-primary" />}
            </span>
            {o.label}
          </label>
        );
      })}
    </fieldset>
  );
}
