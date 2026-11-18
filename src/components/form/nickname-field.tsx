"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useWatch, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { NICKNAME_MAX } from "@/lib/domain/nickname";
import { cn } from "@/lib/utils";
import { checkNickname } from "@/server/actions/profile";

type Status = { state: "idle" } | { state: "checking" } | { state: "ok" } | { state: "error"; message: string };

/**
 * Nickname input with an "@" prefix and a live availability check.
 * The server re-checks on submit; this is only feedback while typing.
 */
export function NicknameField<T extends FieldValues>({
  control,
  name,
  current,
  description,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  /** The user's current nickname, which is "available" to them. */
  current?: string | null;
  description?: string;
}) {
  const value = useWatch({ control, name }) as string | undefined;
  const raw = (value ?? "").trim().replace(/^@+/, "").toLowerCase();
  const [checked, setChecked] = useState<{ nickname: string; available: boolean; message: string | null } | null>(
    null,
  );

  useEffect(() => {
    if (raw.length < 3 || raw === current) return;
    const timer = setTimeout(async () => {
      const result = await checkNickname(raw);
      if (result.ok) setChecked(result.data);
    }, 400);
    return () => clearTimeout(timer);
  }, [raw, current]);

  // Derived: only a check for the value currently typed counts.
  const status: Status =
    raw.length < 3 || raw === current
      ? { state: "idle" }
      : checked?.nickname !== raw
        ? { state: "checking" }
        : checked.available
          ? { state: "ok" }
          : { state: "error", message: checked.message ?? "No disponible" };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || status.state === "error"} className="gap-2">
          <FieldLabel htmlFor={name} className="text-[13px] font-semibold text-muted-foreground">
            Apodo
          </FieldLabel>
          <div
            className={cn(
              "flex h-[52px] items-center gap-1 rounded-xl border border-input bg-card px-3.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
              (fieldState.invalid || status.state === "error") && "border-destructive",
            )}
          >
            <span aria-hidden="true" className="text-[15px] text-muted-foreground">
              @
            </span>
            <input
              {...field}
              value={field.value ?? ""}
              id={name}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={NICKNAME_MAX + 1}
              placeholder="tuapodo"
              aria-invalid={fieldState.invalid || status.state === "error"}
              aria-describedby={`${name}-status`}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            />
            <span id={`${name}-status`} aria-live="polite" className="flex items-center">
              {status.state === "checking" && <Spinner className="text-muted-foreground" />}
              {status.state === "ok" && (
                <>
                  <Check aria-hidden="true" className="size-4 text-level-up" />
                  <span className="sr-only">Disponible</span>
                </>
              )}
              {status.state === "error" && <X aria-hidden="true" className="size-4 text-destructive" />}
            </span>
          </div>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : status.state === "error" ? (
            <FieldError>{status.message}</FieldError>
          ) : (
            <FieldDescription className="text-[13px]">
              {description ?? "Único. Así te encontrarán otros jugadores."}
            </FieldDescription>
          )}
        </Field>
      )}
    />
  );
}
