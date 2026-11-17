import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ActionError } from "./errors";

/** Authorization by group and role (PRD §6: checked on every mutation). */

export async function getMembership(groupId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

export async function requireMember(groupId: string) {
  const user = await requireUser();
  const membership = await getMembership(groupId, user.id);
  if (!membership || membership.status !== "active") throw new ActionError("No eres miembro de este grupo.");
  return { user, membership };
}

export async function requireAdmin(groupId: string) {
  const ctx = await requireMember(groupId);
  if (ctx.membership.role !== "admin") throw new ActionError("Solo los admins del grupo pueden hacer esto.");
  return ctx;
}
