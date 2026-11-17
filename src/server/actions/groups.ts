"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { groupInvites, groupMembers, groups, matches, matchSignups } from "@/db/schema";
import { absoluteUrl } from "@/lib/app-url";
import { actionEmail, sendEmail } from "@/lib/email";
import { requireUser } from "@/lib/session";
import {
  emailInviteSchema,
  groupFormSchema,
  inviteLinkSchema,
  toGroupValues,
  type GroupFormValues,
} from "@/lib/validation/group";
import { ActionError, idSchema, runAction } from "../action";
import { requireAdmin, requireMember } from "../authz";
import { geocode } from "../geocode";
import { leaveMatch } from "../match-service";

export async function createGroup(input: GroupFormValues) {
  return runAction(async () => {
    const user = await requireUser();
    const values = toGroupValues(groupFormSchema.parse(input));
    const geo = await geocode(values.baseLabel);
    const id = await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groups)
        .values({ ...values, baseLocation: geo?.location ?? null, createdBy: user.id })
        .returning({ id: groups.id });
      await tx.insert(groupMembers).values({ groupId: group!.id, userId: user.id, role: "admin" });
      return group!.id;
    });
    return { id, located: Boolean(geo) };
  });
}

export async function updateGroup(groupId: string, input: GroupFormValues) {
  return runAction(async () => {
    idSchema.parse(groupId);
    await requireAdmin(groupId);
    const values = toGroupValues(groupFormSchema.parse(input));
    const [current] = await db.select({ baseLabel: groups.baseLabel }).from(groups).where(eq(groups.id, groupId));
    let located = true;
    const update: Partial<typeof groups.$inferInsert> = values;
    if (current?.baseLabel !== values.baseLabel) {
      const geo = await geocode(values.baseLabel);
      update.baseLocation = geo?.location ?? null;
      located = Boolean(geo);
    }
    await db.update(groups).set(update).where(eq(groups.id, groupId));
    refresh();
    return { located };
  });
}

export async function deleteGroup(groupId: string) {
  return runAction(async () => {
    idSchema.parse(groupId);
    await requireAdmin(groupId);
    await db.delete(groups).where(eq(groups.id, groupId));
    return null;
  });
}

async function activeAdminCount(groupId: string) {
  return db.$count(
    groupMembers,
    and(eq(groupMembers.groupId, groupId), eq(groupMembers.role, "admin"), eq(groupMembers.status, "active")),
  );
}

/** Takes a member off the group's upcoming matches (frees spots, promotes the waitlist). */
async function withdrawFromUpcoming(groupId: string, userId: string) {
  const upcoming = await db
    .select({ matchId: matchSignups.matchId })
    .from(matchSignups)
    .innerJoin(matches, eq(matches.id, matchSignups.matchId))
    .where(
      and(
        eq(matches.groupId, groupId),
        eq(matchSignups.userId, userId),
        inArray(matchSignups.status, ["confirmed", "waitlist"]),
        inArray(matches.status, ["open", "closed"]),
        sql`${matches.startsAt} > now()`,
      ),
    );
  for (const { matchId } of upcoming) {
    await leaveMatch(matchId, userId).catch(() => undefined);
  }
}

export async function joinPublicGroup(groupId: string) {
  return runAction(async () => {
    idSchema.parse(groupId);
    const user = await requireUser();
    const [group] = await db.select({ visibility: groups.visibility }).from(groups).where(eq(groups.id, groupId));
    if (!group) throw new ActionError("Ese grupo no existe.");
    if (group.visibility !== "public") throw new ActionError("Este grupo es privado: necesitas una invitación.");
    const [existing] = await db
      .select({ status: groupMembers.status })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    if (existing?.status === "banned") throw new ActionError("No puedes unirte a este grupo.");
    if (existing?.status === "active") return null;
    await db
      .insert(groupMembers)
      .values({ groupId, userId: user.id })
      .onConflictDoUpdate({
        target: [groupMembers.groupId, groupMembers.userId],
        set: { status: "active", role: "member", joinedAt: new Date() },
      });
    refresh();
    return null;
  });
}

export async function leaveGroup(groupId: string) {
  return runAction(async () => {
    idSchema.parse(groupId);
    const { user, membership } = await requireMember(groupId);
    if (membership.role === "admin" && (await activeAdminCount(groupId)) <= 1) {
      const others = await db.$count(
        groupMembers,
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active"), ne(groupMembers.userId, user.id)),
      );
      throw new ActionError(
        others > 0
          ? "Eres el único admin: nombra a otro admin antes de salir."
          : "Eres el único miembro. Si ya no lo usáis, borra el grupo.",
      );
    }
    await withdrawFromUpcoming(groupId, user.id);
    await db
      .update(groupMembers)
      .set({ status: "left", role: "member" })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    return null;
  });
}

export async function setMemberRole(groupId: string, userId: string, role: "admin" | "member") {
  return runAction(async () => {
    idSchema.parse(groupId);
    idSchema.parse(userId);
    await requireAdmin(groupId);
    const [target] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    if (!target || target.status !== "active") throw new ActionError("Esa persona no es miembro del grupo.");
    if (role === "member" && target.role === "admin" && (await activeAdminCount(groupId)) <= 1) {
      throw new ActionError("El grupo necesita al menos un admin.");
    }
    await db
      .update(groupMembers)
      .set({ role })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    refresh();
    return null;
  });
}

export async function removeMember(groupId: string, userId: string) {
  return runAction(async () => {
    idSchema.parse(groupId);
    idSchema.parse(userId);
    const { user } = await requireAdmin(groupId);
    if (user.id === userId) throw new ActionError("Para salir tú, usa «Salir del grupo».");
    await withdrawFromUpcoming(groupId, userId);
    await db
      .update(groupMembers)
      .set({ status: "banned", role: "member" })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    refresh();
    return null;
  });
}

function newToken() {
  return randomBytes(18).toString("base64url");
}

export async function createInviteLink(groupId: string, input: { expiresInDays: string; maxUses: string }) {
  return runAction(async () => {
    idSchema.parse(groupId);
    const { user } = await requireAdmin(groupId);
    const { expiresInDays, maxUses } = inviteLinkSchema.parse(input);
    const token = newToken();
    await db.insert(groupInvites).values({
      groupId,
      token,
      createdBy: user.id,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86_400_000) : null,
    });
    refresh();
    return { url: absoluteUrl(`/invitacion/${token}`) };
  });
}

export async function revokeInvite(groupId: string, inviteId: string) {
  return runAction(async () => {
    idSchema.parse(groupId);
    idSchema.parse(inviteId);
    await requireAdmin(groupId);
    await db
      .update(groupInvites)
      .set({ revokedAt: new Date() })
      .where(and(eq(groupInvites.id, inviteId), eq(groupInvites.groupId, groupId)));
    refresh();
    return null;
  });
}

export async function sendEmailInvite(groupId: string, input: { email: string }) {
  return runAction(async () => {
    idSchema.parse(groupId);
    const { user } = await requireAdmin(groupId);
    const { email } = emailInviteSchema.parse(input);
    const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, groupId));
    const token = newToken();
    await db.insert(groupInvites).values({
      groupId,
      token,
      email,
      maxUses: 1,
      createdBy: user.id,
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
    });
    await sendEmail({
      to: email,
      subject: `${user.name || "Alguien"} te invita a ${group!.name} en Furbo`,
      ...actionEmail({
        title: `Te invitan a ${group!.name}`,
        intro: `${user.name || "Un admin"} te ha invitado a su grupo de fútbol en Furbo. Con el enlace entras directamente, aunque el grupo sea privado.`,
        cta: "Unirme al grupo",
        url: absoluteUrl(`/invitacion/${token}`),
        footer: "La invitación caduca en 14 días y solo sirve para este email.",
      }),
    });
    refresh();
    return null;
  });
}

export async function acceptInvite(token: string) {
  return runAction(async () => {
    const user = await requireUser();
    return db.transaction(async (tx) => {
      const [invite] = await tx.select().from(groupInvites).where(eq(groupInvites.token, token)).for("update");
      if (!invite || invite.revokedAt) throw new ActionError("Esta invitación ya no es válida.");
      if (invite.expiresAt && invite.expiresAt <= new Date()) throw new ActionError("Esta invitación ha caducado.");
      if (invite.maxUses != null && invite.uses >= invite.maxUses) {
        throw new ActionError("Esta invitación ya se ha usado del todo.");
      }
      if (invite.email && invite.email !== user.email.toLowerCase()) {
        throw new ActionError(`Esta invitación es para ${invite.email}. Entra con esa cuenta.`);
      }
      const [existing] = await tx
        .select({ status: groupMembers.status })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, invite.groupId), eq(groupMembers.userId, user.id)));
      if (existing?.status === "active") return { groupId: invite.groupId };
      // A personal email invite can bring back a removed member; a shared link can't.
      if (existing?.status === "banned" && !invite.email) throw new ActionError("No puedes unirte a este grupo.");

      await tx
        .insert(groupMembers)
        .values({ groupId: invite.groupId, userId: user.id })
        .onConflictDoUpdate({
          target: [groupMembers.groupId, groupMembers.userId],
          set: { status: "active", role: "member", joinedAt: new Date() },
        });
      await tx
        .update(groupInvites)
        .set({ uses: sql`${groupInvites.uses} + 1` })
        .where(eq(groupInvites.id, invite.id));
      return { groupId: invite.groupId };
    });
  });
}
