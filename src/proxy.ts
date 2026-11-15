import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/entrar", "/registro"];

/**
 * Optimistic redirects based on the presence of the session cookie only.
 * Real authorization happens on the server (src/lib/session.ts).
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (!hasSession && !AUTH_PAGES.includes(pathname)) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/inicio/:path*", "/grupos/:path*", "/partidos/:path*", "/perfil/:path*", "/entrar", "/registro"],
};
