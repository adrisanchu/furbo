import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/app/action-button";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/server/action";
import { deleteGroup } from "@/server/actions/groups";
import { getMembership } from "@/server/authz";
import { groupById } from "@/server/queries";
import { GroupForm } from "../../group-form";

export const metadata: Metadata = { title: "Editar grupo" };

export default async function EditGroupPage({ params }: PageProps<"/grupos/[id]/editar">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  const [group, membership] = await Promise.all([groupById(id), getMembership(id, user.id)]);
  if (!group || membership?.status !== "active" || membership.role !== "admin") notFound();
  const isOwner = group.ownerId === user.id;

  return (
    <>
      <PageHeader backHref={`/grupos/${id}`} title="Editar grupo" eyebrow={group.name} />
      <GroupForm
        groupId={id}
        canPrivate={group.ownerPlan === "premium" || group.visibility === "private"}
        defaults={{
          name: group.name,
          description: group.description ?? "",
          visibility: group.visibility,
          baseLabel: group.baseLabel,
          referenceRating: group.referenceRating.toFixed(1),
          defaultFormat: group.defaultFormat,
          defaultCourtPrice:
            group.defaultCourtPriceCents != null ? (group.defaultCourtPriceCents / 100).toString().replace(".", ",") : "",
          whatsappUrl: group.whatsappUrl ?? "",
        }}
      />
      {isOwner && (
        <section className="flex flex-col gap-2 rounded-2xl border border-destructive/40 p-4">
          <h2 className="text-[15px] font-semibold">Borrar grupo</h2>
          <p className="text-[13px] text-muted-foreground">
            Se borran también sus partidos, apuntados, pagos e invitaciones. No se puede deshacer.
          </p>
          <ActionButton
            variant="destructive"
            size="lg"
            action={deleteGroup.bind(null, id)}
            success="Grupo borrado"
            redirectTo="/grupos"
            confirm={{
              title: `¿Borrar «${group.name}»?`,
              description: "Se borrarán el grupo, sus partidos y el historial de pagos. No se puede deshacer.",
              confirmLabel: "Borrar grupo",
            }}
          >
            Borrar grupo
          </ActionButton>
        </section>
      )}
    </>
  );
}
