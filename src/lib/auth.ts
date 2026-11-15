import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { actionEmail, sendEmail } from "@/lib/email";

export const auth = betterAuth({
  appName: "Furbo",
  baseURL: process.env.BETTER_AUTH_URL,
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
      preferredPosition: { type: "string", required: false, input: false },
      rating: { type: "number", required: false, input: false },
      ratingProvisional: { type: "boolean", required: false, input: false },
      matchesPlayed: { type: "number", required: false, input: false },
      theme: { type: "string", required: false, input: false },
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
