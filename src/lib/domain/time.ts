/**
 * Time helpers. Furbo shows and edits times in Spain's peninsular zone.
 * Inputs use `<input type="datetime-local">` values ("2026-11-19T21:00"),
 * interpreted as Europe/Madrid wall time.
 */

export const APP_TIME_ZONE = "Europe/Madrid";

function offsetMinutesAt(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** "2026-11-19T21:00" (Madrid wall time) → Date (UTC instant). Null if malformed. */
export function zonedLocalToUtc(local: string, timeZone = APP_TIME_ZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes handle DST transitions.
  let utc = wall - offsetMinutesAt(wall, timeZone) * 60000;
  utc = wall - offsetMinutesAt(utc, timeZone) * 60000;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date → "2026-11-19T21:00" in Madrid wall time (for datetime-local defaults). */
export function utcToZonedLocal(date: Date, timeZone = APP_TIME_ZONE): string {
  const local = new Date(date.getTime() + offsetMinutesAt(date.getTime(), timeZone) * 60000);
  return local.toISOString().slice(0, 16);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { timeZone: APP_TIME_ZONE, ...opts });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit" });
const dowFmt = fmt({ weekday: "short" });
const dayFmt = fmt({ day: "numeric" });
const longDateFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const shortDateFmt = fmt({ weekday: "short", day: "numeric", month: "short" });

const clean = (s: string) => s.replace(/\./g, "");

/** "21:00" */
export const formatTime = (d: Date) => timeFmt.format(d);
/** "JUE" */
export const formatDow = (d: Date) => clean(dowFmt.format(d)).toUpperCase();
/** "19" */
export const formatDay = (d: Date) => dayFmt.format(d);
/** "jueves, 19 de noviembre" */
export const formatLongDate = (d: Date) => longDateFmt.format(d);
/** "JUE 19 NOV" */
export const formatShortDate = (d: Date) => clean(shortDateFmt.format(d)).replace(",", "").toUpperCase();
/** "jue 19 nov, 21:00" */
export const formatDateTime = (d: Date) => `${clean(shortDateFmt.format(d)).replace(",", "")}, ${formatTime(d)}`;

/** "en 4 días", "mañana", "hoy", "hace 2 días" (calendar days in Madrid). */
export function formatRelativeDay(d: Date, now = new Date()): string {
  const dayKey = (x: Date) => utcToZonedLocal(x).slice(0, 10);
  const diff = Math.round((Date.parse(dayKey(d)) - Date.parse(dayKey(now))) / 86_400_000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === -1) return "ayer";
  return diff > 0 ? `en ${diff} días` : `hace ${-diff} días`;
}

/** Default match slot: same weekday next week at 21:00, sign-ups close 24 h before. */
export function defaultMatchSchedule(now: Date): { startsAt: string; signupDeadline: string } {
  const inAWeek = utcToZonedLocal(new Date(now.getTime() + 7 * 86_400_000)).slice(0, 10);
  const startsAt = `${inAWeek}T21:00`;
  const signupDeadline = utcToZonedLocal(new Date(zonedLocalToUtc(startsAt)!.getTime() - 86_400_000));
  return { startsAt, signupDeadline };
}
