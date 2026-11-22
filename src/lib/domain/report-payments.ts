/**
 * Payments when the match report adds players who didn't sign up.
 *
 * Signing up (and paying) and playing are separate: `match_signups` vs
 * `match_players`. When an admin's report includes someone without a
 * confirmed sign-up, that person becomes a payer and the court price is split
 * again among everyone who owes:
 *   - confirmed sign-ups (no-shows too: they held a spot),
 *   - players added in the report,
 *   - late withdrawers who still owe their share.
 *
 * Only report additions trigger a re-split; joins through "Me apunto" after
 * closing keep the Phase 1 rules. Paid flags are kept as they are: any
 * difference is settled outside the app.
 */

export type SignupForPayments = {
  userId: string;
  status: "confirmed" | "waitlist" | "withdrawn";
  amountDueCents: number | null;
  addedInReport: boolean;
};

export type ReportPaymentsPlan = {
  /** Line-up players without a confirmed sign-up: they become payers. */
  add: string[];
  /** Previously added in the report but no longer in the line-up (corrections). */
  drop: string[];
  /** Everyone who splits the court price after the change. */
  payers: string[];
  /** False when the report adds/removes nobody: shares stay as they are. */
  changed: boolean;
};

export function planReportPayments(input: { signups: SignupForPayments[]; lineupIds: string[] }): ReportPaymentsPlan {
  const lineup = new Set(input.lineupIds);
  const byUser = new Map(input.signups.map((s) => [s.userId, s]));

  const add = input.lineupIds.filter((id) => byUser.get(id)?.status !== "confirmed");
  const drop = input.signups.filter((s) => s.addedInReport && s.status === "confirmed" && !lineup.has(s.userId)).map((s) => s.userId);
  const dropped = new Set(drop);

  const payers = [
    ...input.signups
      .filter(
        (s) =>
          (s.status === "confirmed" && !dropped.has(s.userId)) ||
          (s.status === "withdrawn" && (s.amountDueCents ?? 0) > 0 && !lineup.has(s.userId)),
      )
      .map((s) => s.userId),
    ...add,
  ];

  return { add, drop, payers: [...new Set(payers)], changed: add.length > 0 || drop.length > 0 };
}
