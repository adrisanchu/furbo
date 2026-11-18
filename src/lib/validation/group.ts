import { z } from "zod";
import { parseEurosToCents } from "@/lib/domain/money";

/** Group form (PRD §5.2). Values are strings as typed; `toGroupValues` converts them. */
export const groupFormSchema = z.object({
  name: z.string().trim().min(2, "Ponle un nombre de al menos 2 letras").max(60, "Máximo 60 caracteres"),
  description: z.string().trim().max(280, "Máximo 280 caracteres"),
  visibility: z.enum(["public", "private"]),
  baseLabel: z
    .string()
    .trim()
    .min(3, "Indica dónde jugáis: campo, dirección o barrio")
    .max(160, "Máximo 160 caracteres"),
  referenceRating: z
    .string()
    .trim()
    .refine((v) => /^\d{1,2}([.,]\d)?$/.test(v) && Number(v.replace(",", ".")) >= 1 && Number(v.replace(",", ".")) <= 10, {
      message: "Entre 1.0 y 10.0, con un decimal",
    }),
  defaultFormat: z.enum(["f5", "f7", "f11"]),
  defaultCourtPrice: z
    .string()
    .trim()
    .refine((v) => v === "" || parseEurosToCents(v) !== null, { message: "Precio no válido (p. ej. 50 o 49,50)" }),
  whatsappUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), { message: "Pega el enlace completo (https://…)" }),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;

export const EMPTY_GROUP: GroupFormValues = {
  name: "",
  description: "",
  visibility: "public",
  baseLabel: "",
  referenceRating: "5.0",
  defaultFormat: "f7",
  defaultCourtPrice: "",
  whatsappUrl: "",
};

export function toGroupValues(values: GroupFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    visibility: values.visibility,
    baseLabel: values.baseLabel,
    referenceRating: Math.round(Number(values.referenceRating.replace(",", ".")) * 10) / 10,
    defaultFormat: values.defaultFormat,
    defaultCourtPriceCents: values.defaultCourtPrice ? parseEurosToCents(values.defaultCourtPrice) : null,
    whatsappUrl: values.whatsappUrl || null,
  };
}

export const inviteLinkSchema = z.object({
  expiresInDays: z.enum(["", "1", "7", "30"]),
  maxUses: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500), {
      message: "Entre 1 y 500, o vacío para ilimitado",
    }),
});

export const emailInviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Introduce un email válido")),
});
