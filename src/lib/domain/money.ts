/** Money helpers. All amounts are integer cents (PRD §5.6). */

/** Per-player share: total / players, rounded UP to the cent. */
export function costPerPlayerCents(totalCents: number, players: number): number {
  if (players <= 0) return 0;
  return Math.ceil(totalCents / players);
}

/** Rounding surplus that goes to the group's (informational) pot. */
export function roundingSurplusCents(totalCents: number, players: number): number {
  if (players <= 0) return 0;
  return costPerPlayerCents(totalCents, players) * players - totalCents;
}

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** 625 → "6,25 €" */
export function formatEuros(cents: number): string {
  return euro.format(cents / 100);
}

/** "50", "50,5", "50.50 €" → 5050. Returns null when it isn't a valid amount. */
export function parseEurosToCents(input: string): number | null {
  const cleaned = input.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
