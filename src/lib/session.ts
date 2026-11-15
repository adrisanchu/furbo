import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * Data Access Layer for the session. The proxy only does an optimistic
 * cookie check; every page and mutation must call these.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * For /entrar and /registro: send already signed-in users on. Uses the
 * validated session (not just the cookie), so stale cookies can't loop.
 */
export async function redirectIfSignedIn(destination: string) {
  if (await getSession()) redirect(destination);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  return session.user;
}
