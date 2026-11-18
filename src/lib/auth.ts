import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { appOrigins, appUrl } from "@/lib/app-url";
import { actionEmail, sendEmail } from "@/lib/email";
import { nicknameError, normalizeNickname } from "@/lib/domain/nickname";
import { isNicknameTaken } from "@/server/nicknames";

export const auth = betterAuth({
  appName: "Furbo",
  baseURL: appUrl,
  trustedOrigins: appOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  advanced: {
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña de Furbo",
        ...actionEmail({
          title: "Restablece tu contraseña",
          intro: "Has pedido cambiar tu contraseña. El enlace caduca en 1 hora.",
          cta: "Elegir nueva contraseña",
          url,
          footer: "Si no has sido tú, ignora este correo: tu contraseña no cambiará.",
        }),
      });
    },
  },
  user: {
    additionalFields: {
      // Identity (sign-up form). Later edits go through our own profile action.
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      nickname: { type: "string", required: false, input: true },
      nicknameChangedAt: { type: "date", required: false, input: false },
      plan: { type: "string", required: false, input: false },
      preferredPosition: { type: "string", required: false, input: false },
      rating: { type: "number", required: false, input: false },
      ratingProvisional: { type: "boolean", required: false, input: false },
      matchesPlayed: { type: "number", required: false, input: false },
      theme: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Validates and normalizes the identity fields sent by the sign-up form.
        // Magic-link sign-ups have none: the onboarding asks for them.
        before: async (user) => {
          const firstName = typeof user.firstName === "string" ? user.firstName.trim() : null;
          const lastName = typeof user.lastName === "string" ? user.lastName.trim() : null;
          let nickname: string | null = null;
          if (typeof user.nickname === "string" && user.nickname.trim()) {
            nickname = normalizeNickname(user.nickname);
            const error = nicknameError(nickname);
            if (error) throw new APIError("BAD_REQUEST", { code: "INVALID_NICKNAME", message: error });
            if (await isNicknameTaken(nickname)) {
              throw new APIError("BAD_REQUEST", { code: "NICKNAME_TAKEN", message: "Ese apodo ya está cogido" });
            }
          }
          const name = [firstName, lastName].filter(Boolean).join(" ") || user.name;
          return { data: { ...user, firstName, lastName, nickname, name } };
        },
      },
      update: {
        // Identity changes only through updateProfile (nickname cooldown, uniqueness).
        // Better Auth merges a returned `data` over the original update, so
        // stripping keys doesn't work: reject the request instead. Our own
        // profile action writes with Drizzle and never goes through here.
        before: async (user) => {
          const blocked = ["firstName", "lastName", "nickname", "name"];
          // Better Auth passes absent optional fields as `undefined` keys.
          if (blocked.some((key) => user[key] !== undefined)) {
            throw new APIError("FORBIDDEN", {
              code: "IDENTITY_VIA_PROFILE",
              message: "El nombre y el apodo se cambian desde tu perfil.",
            });
          }
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Tu enlace para entrar en Furbo",
          ...actionEmail({
            title: "Entra en Furbo",
            intro: "Pulsa el botón para entrar. El enlace caduca en 15 minutos y solo sirve una vez.",
            cta: "Entrar en Furbo",
            url,
            footer: "Si no has pedido este enlace, ignora este correo.",
          }),
        });
      },
    }),
    // Must be last: lets Server Actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
