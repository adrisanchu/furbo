/**
 * Who can create groups. There is no payment yet: `users.plan` is set by
 * hand; later a payment will flip it.
 *
 * - free: owns up to 2 groups, and they must be public (public groups feed
 *   discovery and growth; private groups are a premium feature).
 * - premium: owns up to 10 groups, public or private.
 *
 * Limits count the groups a user currently OWNS (deleting or handing over a
 * group frees the slot).
 */

export type Plan = "free" | "premium";
export type Visibility = "public" | "private";

export const PLAN_LIMITS: Record<Plan, { maxOwnedGroups: number; privateGroups: boolean }> = {
  free: { maxOwnedGroups: 2, privateGroups: false },
  premium: { maxOwnedGroups: 10, privateGroups: true },
};

export type OwnedGroups = { public: number; private: number };

export type GroupQuotaCheck = { ok: true } | { ok: false; reason: "private-needs-premium" | "limit-reached" };

/** Can a user with `plan` and `owned` groups own one more with `visibility`? */
export function checkGroupQuota(plan: Plan, owned: OwnedGroups, visibility: Visibility): GroupQuotaCheck {
  const limits = PLAN_LIMITS[plan];
  if (visibility === "private" && !limits.privateGroups) return { ok: false, reason: "private-needs-premium" };
  if (owned.public + owned.private >= limits.maxOwnedGroups) return { ok: false, reason: "limit-reached" };
  return { ok: true };
}

/**
 * Can the owner switch an existing group's visibility? Only the private side
 * is gated: the group already counts towards the limit.
 */
export function checkVisibilityChange(plan: Plan, from: Visibility, to: Visibility): GroupQuotaCheck {
  if (from === to || to === "public") return { ok: true };
  return PLAN_LIMITS[plan].privateGroups ? { ok: true } : { ok: false, reason: "private-needs-premium" };
}

export function quotaMessage(reason: "private-needs-premium" | "limit-reached", plan: Plan): string {
  if (reason === "private-needs-premium") {
    return "Los grupos privados son de Furbo Premium. Puedes crear un grupo público.";
  }
  return plan === "free"
    ? `Ya tienes ${PLAN_LIMITS.free.maxOwnedGroups} grupos, el máximo de la cuenta gratuita. Con Premium puedes tener hasta ${PLAN_LIMITS.premium.maxOwnedGroups}.`
    : `Ya tienes ${PLAN_LIMITS.premium.maxOwnedGroups} grupos, el máximo permitido.`;
}
