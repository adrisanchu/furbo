import { z } from "zod";
import { identitySchema } from "./profile";

/** Shared client/server validation for auth forms (PRD §7: Zod as single source). */

// Normalise first: in Zod 4, checks run in declaration order.
const email = z.string().trim().toLowerCase().pipe(z.email("Introduce un email válido"));
const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres");

export const signUpSchema = identitySchema.extend({
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Introduce tu contraseña"),
});

export const emailOnlySchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos.",
  USER_ALREADY_EXISTS: "Ya hay una cuenta con ese email. Prueba a entrar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya hay una cuenta con ese email. Prueba a entrar.",
  INVALID_TOKEN: "El enlace no es válido o ha caducado. Pide uno nuevo.",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta.",
  TOO_MANY_REQUESTS: "Demasiados intentos. Espera un momento.",
  NICKNAME_TAKEN: "Ese apodo ya está cogido. Prueba con otro.",
};

/** Maps Better Auth error codes to Spanish copy. */
export function authErrorMessage(
  error: { code?: string; status?: number; message?: string } | null | undefined,
): string {
  if (error?.status === 429) return AUTH_ERRORS.TOO_MANY_REQUESTS;
  // Our own sign-up hook already sends Spanish copy.
  if (error?.code === "INVALID_NICKNAME" && error.message) return error.message;
  return (error?.code && AUTH_ERRORS[error.code]) || "Algo ha fallado. Inténtalo de nuevo.";
}
