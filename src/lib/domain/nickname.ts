/**
 * Nicknames: the unique, searchable handle of a player (shown as @alexm).
 * 3–20 chars, lowercase letters, digits, "_" and "."; starts with a letter or
 * digit; compared case-insensitively (stored lowercase).
 */

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_CHANGE_COOLDOWN_DAYS = 30;

const NICKNAME_RE = /^[a-z0-9][a-z0-9._]*$/;

/** Handles that could be mistaken for the app or its staff. */
const RESERVED = new Set(["admin", "admins", "furbo", "soporte", "support", "root", "staff", "moderador", "sistema"]);

export function normalizeNickname(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

/** Returns a Spanish error message, or null when the (normalized) nickname is valid. */
export function nicknameError(nickname: string): string | null {
  if (nickname.length < NICKNAME_MIN) return `Mínimo ${NICKNAME_MIN} caracteres`;
  if (nickname.length > NICKNAME_MAX) return `Máximo ${NICKNAME_MAX} caracteres`;
  if (!NICKNAME_RE.test(nickname)) return "Solo letras sin tilde, números, «_» y «.», empezando por letra o número";
  if (/[._]{2}/.test(nickname)) return "No uses «.» o «_» seguidos";
  if (RESERVED.has(nickname)) return "Ese apodo está reservado";
  return null;
}

/** First change is free; after that, once every 30 days. */
export function nextNicknameChangeAt(changedAt: Date | null): Date | null {
  if (!changedAt) return null;
  return new Date(changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_DAYS * 86_400_000);
}

export function canChangeNickname(changedAt: Date | null, now: Date): boolean {
  const next = nextNicknameChangeAt(changedAt);
  return !next || now >= next;
}

/** Suggestion from a name: "Álex Martín" → "alexmartin" (accents stripped). */
export function suggestNickname(firstName: string, lastName = ""): string {
  const base = `${firstName}${lastName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return base.slice(0, NICKNAME_MAX);
}

/** "Álex Martín" for people who share a group; "Álex M." where space is tight. */
export function fullName(p: { firstName: string | null; lastName: string | null; name: string }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.name;
}

export function shortName(p: { firstName: string | null; lastName: string | null; name: string }): string {
  if (!p.firstName) return p.name.split(" ")[0] ?? p.name;
  const initial = p.lastName?.trim()[0];
  return initial ? `${p.firstName} ${initial.toUpperCase()}.` : p.firstName;
}
