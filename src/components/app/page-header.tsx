import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Sub-page header: back link, title and optional actions on the right. */
export function PageHeader({
  backHref,
  backLabel = "Volver",
  title,
  eyebrow,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pt-1">
      {(backHref || actions) && (
        <div className="flex min-h-11 items-center justify-between gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="-ml-2 flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
            </Link>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {(eyebrow || title) && (
        <div className="flex flex-col gap-1">
          {eyebrow && <span className="text-[13px] text-muted-foreground">{eyebrow}</span>}
          {title && <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{title}</h1>}
        </div>
      )}
    </header>
  );
}

export function SectionTitle({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-lg font-bold">
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon?: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <article className="flex gap-3.5 rounded-2xl border border-dashed bg-card p-[18px]">
      {icon && (
        <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-muted text-accent-foreground gamer:text-primary">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {body && <p className="text-sm leading-normal text-muted-foreground">{body}</p>}
        {children}
      </div>
    </article>
  );
}
