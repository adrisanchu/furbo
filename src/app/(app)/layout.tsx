import { redirect } from "next/navigation";
import { after } from "next/server";
import { BottomNav } from "@/components/app/bottom-nav";
import { ThemeSync } from "@/components/app/theme-sync";
import { requireUser } from "@/lib/session";
import { closeDueMatches, notifyBelowMinimum } from "@/server/match-service";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // New players complete their profile (nickname) and level first (PRD §5.1).
  if (!user.nickname || user.rating == null) redirect("/bienvenida");

  // Lazy closing: matches past their deadline close on the next visit, so
  // the app doesn't depend on the (daily, on Hobby) cron for correctness.
  const { belowMinimum } = await closeDueMatches();
  if (belowMinimum.length) after(() => notifyBelowMinimum(belowMinimum));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <ThemeSync saved={user.theme ?? "system"} />
      <main className="flex flex-1 flex-col gap-7 px-5 pt-5 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
