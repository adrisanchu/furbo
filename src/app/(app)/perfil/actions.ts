"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";

const themeSchema = z.enum(["system", "dark", "light", "gamer"]);

export async function saveTheme(theme: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { ok: false };
  await db.update(users).set({ theme: parsed.data }).where(eq(users.id, user.id));
  return { ok: true };
}
