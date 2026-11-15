import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect to /entrar when there is no session cookie at all.
 * Real authorization happens on the server (src/lib/session.ts).
 *
 * The opposite redirect (signed-in user visiting /entrar) is NOT done here:
 * a stale or revoked cookie would bounce between /entrar and /inicio forever.
 * The auth layout does it after validating the session.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/entrar", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/inicio/:path*", "/grupos/:path*", "/partidos/:path*", "/perfil/:path*"],
};
