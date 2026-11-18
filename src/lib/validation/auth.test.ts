import { describe, expect, it } from "vitest";
import { authErrorMessage, resetPasswordSchema, signUpSchema } from "./auth";

describe("auth validation", () => {
  const identity = { firstName: " Álex ", lastName: " Martín ", nickname: " @AlexM " };

  it("normalises email, names and nickname on sign up", () => {
    const parsed = signUpSchema.parse({ ...identity, email: " Alex@Ejemplo.COM ", password: "12345678" });
    expect(parsed).toEqual({
      firstName: "Álex",
      lastName: "Martín",
      nickname: "alexm",
      email: "alex@ejemplo.com",
      password: "12345678",
    });
  });

  it("requires 8+ character passwords and a valid nickname", () => {
    expect(signUpSchema.safeParse({ ...identity, email: "a@b.es", password: "1234567" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...identity, nickname: "a b", email: "a@b.es", password: "12345678" }).success).toBe(
      false,
    );
  });

  it("checks that both reset passwords match", () => {
    const result = resetPasswordSchema.safeParse({ password: "12345678", confirm: "87654321" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirm"]);
  });

  it("maps Better Auth errors to Spanish copy", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("Email o contraseña incorrectos.");
    expect(authErrorMessage({ status: 429 })).toMatch(/Demasiados intentos/);
    expect(authErrorMessage({ code: "SOMETHING_NEW" })).toMatch(/Algo ha fallado/);
    expect(authErrorMessage({ code: "NICKNAME_TAKEN" })).toMatch(/cogido/);
  });
});
