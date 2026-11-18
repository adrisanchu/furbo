"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { groups, matches, matchSignups } from "@/db/schema";
import { matchFormSchema, toMatchValues, type MatchFormValues } from "@/lib/validation/match";
import { ActionError, idSchema, runAction } from "../action";
import { requireAdmin, requireMember } from "../authz";
import { geocode } from "../geocode";
import * as service from "../match-service";

async function groupIdOf(matchId: string) {
  idSchema.parse(matchId);
  const [m] = await db.select({ groupId: matches.groupId }).from(matches).where(eq(matches.id, matchId));
  if (!m) throw new ActionError("Ese partido no existe.");
  return m.groupId;
}

/** Location: empty means the group's base. Geocoded only when it differs. */
async function resolveLocation(groupId: string, label: string) {
  const [group] = await db
    .select({ baseLabel: groups.baseLabel, baseLocation: groups.baseLocation })
    .from(groups)
    .where(eq(groups.id, groupId));
  if (!label || label === group!.baseLabel) {
    return { locationLabel: group!.baseLabel, location: group!.baseLocation };
  }
  const geo = await geocode(label);
  return { locationLabel: label, location: geo?.location ?? null };
}

export async function createMatch(groupId: string, input: MatchFormValues) {
  return runAction(async () => {
    idSchema.parse(groupId);
    const { user } = await requireAdmin(groupId);
    const values = toMatchValues(matchFormSchema.parse(input));
    const now = new Date();
    if (values.startsAt <= now) throw new ActionError("El partido tiene que ser en el futuro.");
    if (values.signupDeadline <= now) throw new ActionError("La fecha límite de inscripción ya ha pasado.");
    const location = await resolveLocation(groupId, values.locationLabel);
    const [match] = await db
      .insert(matches)
      .values({ ...values, ...location, groupId, createdBy: user.id })
      .returning({ id: matches.id });
    return { id: match!.id };
  });
}

export async function updateMatch(matchId: string, input: MatchFormValues) {
  return runAction(async () => {
    const groupId = await groupIdOf(matchId);
    await requireAdmin(groupId);
    const values = toMatchValues(matchFormSchema.parse(input));
    const [current] = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!current) throw new ActionError("Ese partido no existe.");
    if (current.status !== "open" && current.status !== "closed") {
      throw new ActionError("Este partido ya no se puede editar.");
    }

    const location =
      values.locationLabel && values.locationLabel !== current.locationLabel
        ? await resolveLocation(groupId, values.locationLabel)
        : { locationLabel: current.locationLabel, location: current.location };
    const schedule = { startsAt: values.startsAt, durationMin: values.durationMin, ...location };

    if (current.status === "closed") {
      // Shares are fixed: only time and place can change.
      const moneyOrSpotsChanged =
        values.courtPriceCents !== current.courtPriceCents ||
        values.maxPlayers !== current.maxPlayers ||
        values.minPlayers !== current.minPlayers ||
        values.format !== current.format;
      if (moneyOrSpotsChanged) {
        throw new ActionError("La inscripción está cerrada: solo puedes cambiar la fecha, la duración o el lugar.");
      }
      await db.update(matches).set(schedule).where(eq(matches.id, matchId));
      refresh();
      return null;
    }

    const [{ confirmed }] = await db
      .select({ confirmed: count() })
      .from(matchSignups)
      .where(and(eq(matchSignups.matchId, matchId), eq(matchSignups.status, "confirmed")));
    if (values.maxPlayers < confirmed) {
      throw new ActionError(`Ya hay ${confirmed} apuntados: no puedes dejar menos plazas.`);
    }
    await db
      .update(matches)
      .set({
        ...schedule,
        format: values.format,
        maxPlayers: values.maxPlayers,
        minPlayers: values.minPlayers,
        courtPriceCents: values.courtPriceCents,
        signupDeadline: values.signupDeadline,
      })
      .where(eq(matches.id, matchId));
    if (values.maxPlayers === confirmed) await service.closeMatchNow(matchId);
    refresh();
    return null;
  });
}

export async function joinMatch(matchId: string) {
  return runAction(async () => {
    const groupId = await groupIdOf(matchId);
    const { user } = await requireMember(groupId);
    const outcome = await service.joinMatch(matchId, user.id);
    refresh();
    return outcome;
  });
}

export async function leaveMatch(matchId: string) {
  return runAction(async () => {
    const groupId = await groupIdOf(matchId);
    const { user } = await requireMember(groupId);
    const outcome = await service.leaveMatch(matchId, user.id);
    refresh();
    return outcome;
  });
}

export async function closeMatch(matchId: string) {
  return runAction(async () => {
    const groupId = await groupIdOf(matchId);
    await requireAdmin(groupId);
    const result = await service.closeMatchNow(matchId);
    refresh();
    return { belowMinimum: result.belowMinimum };
  });
}

export async function cancelMatch(matchId: string) {
  return runAction(async () => {
    const groupId = await groupIdOf(matchId);
    await requireAdmin(groupId);
    await service.cancelMatch(matchId);
    refresh();
    return null;
  });
}

export async function setPaid(matchId: string, userId: string, paid: boolean) {
  return runAction(async () => {
    idSchema.parse(userId);
    const groupId = await groupIdOf(matchId);
    await requireAdmin(groupId);
    const result = await service.setPaid(matchId, userId, paid);
    refresh();
    return result;
  });
}
