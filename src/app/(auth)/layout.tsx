import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-5 pt-4 pb-10">
      <header className="flex h-11 items-center">
        <Logo />
      </header>
      <main className="flex flex-col gap-7">{children}</main>
    </div>
  );
}
