import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { checkGroupQuota, PLAN_LIMITS, quotaMessage, type Plan } from "@/lib/domain/plans";
import { requireUser } from "@/lib/session";
import { EMPTY_GROUP } from "@/lib/validation/group";
import { ownedGroupCounts } from "@/server/queries";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default async function NewGroupPage() {
  const user = await requireUser();
  const plan: Plan = user.plan === "premium" ? "premium" : "free";
  const owned = await ownedGroupCounts(user.id);
  const quota = checkGroupQuota(plan, owned, "public");
  const limit = PLAN_LIMITS[plan];
  const ownedTotal = owned.public + owned.private;

  if (!quota.ok) {
    return (
      <>
        <PageHeader backHref="/grupos" title="Nuevo grupo" />
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <h2 className="text-lg font-bold">Has llegado al límite de grupos</h2>
          <p className="text-sm leading-normal text-muted-foreground">{quotaMessage(quota.reason, plan)}</p>
          <p className="text-sm leading-normal text-muted-foreground">
            Puedes borrar uno de tus grupos o pasar su propiedad a otro miembro para liberar el hueco. Y siempre puedes
            unirte a grupos que ya existen.
          </p>
          <Button asChild variant="outline" size="lg">
            <Link href="/grupos">Ver grupos</Link>
          </Button>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref="/grupos"
        title="Nuevo grupo"
        eyebrow={`Serás el propietario · ${ownedTotal + 1} de ${limit.maxOwnedGroups} grupos de tu cuenta`}
      />
      {plan === "free" && (
        <p className="-mt-3 text-[13px] text-muted-foreground">
          Con la cuenta gratuita puedes tener hasta {PLAN_LIMITS.free.maxOwnedGroups} grupos públicos. Los grupos
          privados son de Furbo Premium.
        </p>
      )}
      <GroupForm
        canPrivate={limit.privateGroups}
        defaults={{ ...EMPTY_GROUP, referenceRating: (user.rating ?? 5).toFixed(1) }}
      />
    </>
  );
}
