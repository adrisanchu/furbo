import { BottomNav } from "@/components/app/bottom-nav";
import { ThemeSync } from "@/components/app/theme-sync";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <ThemeSync saved={user.theme ?? "system"} />
      <main className="flex flex-1 flex-col gap-7 px-5 pt-5 pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
