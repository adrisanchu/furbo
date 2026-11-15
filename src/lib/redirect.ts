/** Only allow same-origin relative paths as post-login destinations. */
export function safeNext(next: string | string[] | undefined, fallback = "/inicio"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
