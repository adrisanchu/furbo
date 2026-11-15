import Link from "next/link";
import { cn } from "@/lib/utils";

/** Two nested goal frames, as in the landing sketch. */
export function GoalMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 26 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-[26px] text-primary", className)}
    >
      <path d="M2 19V2h22v17" />
      <path d="M6 19V6h14v13" strokeOpacity="0.45" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 font-display text-[22px] font-bold tracking-[0.06em] text-foreground",
        className,
      )}
    >
      <GoalMark />
      FURBO
    </Link>
  );
}
