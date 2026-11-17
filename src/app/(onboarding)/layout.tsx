import { Logo } from "@/components/brand";

export default function OnboardingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 pt-4 pb-8">
      <header className="flex h-11 items-center">
        <Logo href="/inicio" />
      </header>
      {children}
    </div>
  );
}
