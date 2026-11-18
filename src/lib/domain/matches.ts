/**
 * Match sign-up rules (PRD §5.4, §5.6), as pure functions so they can be
 * unit-tested. The server applies the returned plan inside a transaction
 * that holds a `FOR UPDATE` lock on the match row.
 *
 * Lifecycle: open → closed (deadline reached, match filled up, or admin)
 * → played (phase 2) | cancelled.
 *
 * - open: joining takes a spot; the join that fills the last spot closes it.
 * - closed: each confirmed player's amount is fixed. New sign-ups go to the
 *   waitlist, or take a freed spot.
 * - Late withdrawal (closed match): whoever takes the freed spot (first in
 *   the waitlist, or a newcomer) inherits the leaver's debt; if nobody does,
 *   the leaver keeps owing their fixed amount.
 * - Nothing changes once the match has started, been played or cancelled.
 */

export type MatchFormat = "f5" | "f7" | "f11";
export type MatchStatus = "open" | "closed" | "played" | "cancelled";
export type SignupStatus = "confirmed" | "waitlist" | "withdrawn";

export const FORMAT_LABEL: Record<MatchFormat, string> = { f5: "Fútbol 5", f7: "Fútbol 7", f11: "Fútbol 11" };
export const FORMAT_PLAYERS: Record<MatchFormat, number> = { f5: 10, f7: 14, f11: 22 };

/** Default minimum to play: ~80% of the spots (8 of 10, 11 of 14, 18 of 22). */
export function defaultMinPlayers(max: number) {
  return Math.max(2, max - Math.round(max * 0.2));
}

export const STATUS_LABEL: Record<MatchStatus, string> = {
  open: "Abierto",
  closed: "Cerrado",
  played: "Jugado",
  cancelled: "Cancelado",
};

type MatchState = { status: MatchStatus; startsAt: Date };

/** Sign-ups and withdrawals are frozen once the match starts or ends. */
export function isFrozen(match: MatchState, now: Date): boolean {
  return match.status === "played" || match.status === "cancelled" || now >= match.startsAt;
}

/** An open match whose deadline has passed must be closed before anything else. */
export function isDueForClosing(match: { status: MatchStatus; signupDeadline: Date }, now: Date): boolean {
  return match.status === "open" && now >= match.signupDeadline;
}

export type OwedSpot = { userId: string; amountDueCents: number };

export type JoinPlan =
  | { type: "error"; reason: "frozen" | "already" | "due" }
  | { type: "confirmed"; closesMatch: boolean; amountDueCents: number | null; releaseUserId: string | null }
  | { type: "waitlist" };

export function planJoin(input: {
  match: MatchState & { signupDeadline: Date; maxPlayers: number; pricePerPlayerCents: number | null };
  now: Date;
  confirmedCount: number;
  current: SignupStatus | null;
  /** Withdrawn players still owing on this (closed) match, oldest first. */
  owed: OwedSpot[];
}): JoinPlan {
  const { match, now, confirmedCount, current, owed } = input;
  if (isFrozen(match, now)) return { type: "error", reason: "frozen" };
  if (isDueForClosing(match, now)) return { type: "error", reason: "due" };
  if (current === "confirmed" || current === "waitlist") return { type: "error", reason: "already" };

  if (confirmedCount >= match.maxPlayers) return { type: "waitlist" };

  if (match.status === "open") {
    return {
      type: "confirmed",
      closesMatch: confirmedCount + 1 >= match.maxPlayers,
      amountDueCents: null,
      releaseUserId: null,
    };
  }

  // Closed with a free spot: take over the oldest unpaid debt, if any.
  const debt = owed[0];
  return {
    type: "confirmed",
    closesMatch: false,
    amountDueCents: debt ? debt.amountDueCents : (match.pricePerPlayerCents ?? 0),
    releaseUserId: debt ? debt.userId : null,
  };
}

export type WithdrawPlan =
  | { type: "error"; reason: "frozen" | "not-signed-up" }
  | { type: "leave-waitlist" }
  | {
      type: "withdraw";
      /** Keep the leaver's fixed amount (closed match, nobody takes the spot). */
      keepDebt: boolean;
      /** First user in the waitlist moves up. */
      promoteUserId: string | null;
      /** Amount the promoted player inherits (closed match only). */
      promotedAmountDueCents: number | null;
    };

export function planWithdraw(input: {
  match: MatchState;
  now: Date;
  mine: { status: SignupStatus; amountDueCents: number | null; paid: boolean } | null;
  firstInWaitlist: string | null;
  pricePerPlayerCents: number | null;
}): WithdrawPlan {
  const { match, now, mine, firstInWaitlist } = input;
  if (isFrozen(match, now)) return { type: "error", reason: "frozen" };
  if (!mine || mine.status === "withdrawn") return { type: "error", reason: "not-signed-up" };
  if (mine.status === "waitlist") return { type: "leave-waitlist" };

  if (match.status === "open") {
    return { type: "withdraw", keepDebt: false, promoteUserId: firstInWaitlist, promotedAmountDueCents: null };
  }

  // Closed.
  const fixed = mine.amountDueCents ?? input.pricePerPlayerCents ?? 0;
  if (firstInWaitlist) {
    return { type: "withdraw", keepDebt: mine.paid, promoteUserId: firstInWaitlist, promotedAmountDueCents: fixed };
  }
  return { type: "withdraw", keepDebt: true, promoteUserId: null, promotedAmountDueCents: null };
}

/** What a player would pay if they joined now (live price, PRD §5.6). */
export function priceIfJoining(input: {
  status: MatchStatus;
  courtPriceCents: number;
  confirmedCount: number;
  maxPlayers: number;
  pricePerPlayerCents: number | null;
}): number | null {
  if (input.status === "closed") return input.pricePerPlayerCents;
  if (input.status !== "open" || input.confirmedCount >= input.maxPlayers) return null;
  return Math.ceil(input.courtPriceCents / (input.confirmedCount + 1));
}
