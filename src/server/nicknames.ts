import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** `nickname` must already be normalized (lowercase). */
export async function isNicknameTaken(nickname: string, exceptUserId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.nickname, nickname), exceptUserId ? ne(users.id, exceptUserId) : undefined))
    .limit(1);
  return Boolean(row);
}
