import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembers, groups } from "@/db/schema";
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

/** The group owner (creator, or whoever it was handed over to). Always an admin too. */
export async function requireOwner(groupId: string) {
  const ctx = await requireAdmin(groupId);
  const [group] = await db.select({ ownerId: groups.ownerId }).from(groups).where(eq(groups.id, groupId));
  if (group?.ownerId !== ctx.user.id) throw new ActionError("Solo el propietario del grupo puede hacer esto.");
  return ctx;
}
