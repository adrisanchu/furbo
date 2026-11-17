import { closeDueMatches, notifyBelowMinimum } from "@/server/match-service";

/**
 * Closes matches whose sign-up deadline has passed and emails admins when a
 * match didn't reach its minimum (PRD §5.4).
 *
 * Triggered by Vercel Cron (vercel.json). It's a plain authenticated GET, so
 * any external scheduler can call it too (PRD §8: avoid Vercel lock-in).
 * Matches also close lazily when someone opens the app, so a once-a-day
 * schedule (Hobby plan limit) is enough.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : process.env.NODE_ENV === "development";
  if (!authorized) return new Response("Unauthorized", { status: 401 });

  const { closed, belowMinimum } = await closeDueMatches();
  await notifyBelowMinimum(belowMinimum);
  return Response.json({ closed, belowMinimum: belowMinimum.length });
}
