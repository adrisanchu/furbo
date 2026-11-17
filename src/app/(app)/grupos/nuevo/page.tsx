import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { EMPTY_GROUP } from "@/lib/validation/group";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default async function NewGroupPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader backHref="/grupos" title="Nuevo grupo" eyebrow="Serás el admin" />
      <GroupForm defaults={{ ...EMPTY_GROUP, referenceRating: (user.rating ?? 5).toFixed(1) }} />
    </>
  );
}
