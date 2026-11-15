"use client";

import type { ComponentProps, ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Extra content shown at the right of the label (e.g. "¿La has olvidado?"). */
  labelAside?: ReactNode;
} & Omit<ComponentProps<"input">, "name" | "defaultValue">;

/** Large mobile input (52px) wired to react-hook-form + shadcn Field. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  labelAside,
  className,
  id: idProp,
  ...input
}: Props<T>) {
  // Pass `id` when two forms on one page share a field name.
  const id = idProp ?? name;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="gap-2">
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor={id} className="text-[13px] font-semibold text-muted-foreground">
              {label}
            </FieldLabel>
            {labelAside}
          </div>
          <Input
            {...field}
            {...input}
            value={field.value ?? ""}
            id={id}
            aria-invalid={fieldState.invalid}
            className={cn(
              "h-[52px] rounded-xl bg-card px-3.5 text-[15px] placeholder:text-subtle md:text-[15px] dark:bg-card",
              className,
            )}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
