"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Link2, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { emailInviteSchema, inviteLinkSchema } from "@/lib/validation/group";
import { createInviteLink, revokeInvite, sendEmailInvite } from "@/server/actions/groups";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function InviteLinkForm({ groupId }: { groupId: string }) {
  const form = useForm({
    resolver: zodResolver(inviteLinkSchema),
    defaultValues: { expiresInDays: "7" as "" | "1" | "7" | "30", maxUses: "" },
  });

  async function onSubmit(values: { expiresInDays: "" | "1" | "7" | "30"; maxUses: string }) {
    const result = await createInviteLink(groupId, values);
    if (!result.ok) return void toast.error(result.error);
    toast.success((await copy(result.data.url)) ? "Enlace creado y copiado" : "Enlace creado");
    form.reset(values);
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          control={form.control}
          name="expiresInDays"
          label="Caduca en"
          options={[
            { value: "1", label: "1 día" },
            { value: "7", label: "7 días" },
            { value: "30", label: "30 días" },
            { value: "", label: "Nunca" },
          ]}
        />
        <TextField control={form.control} name="maxUses" label="Usos máximos" inputMode="numeric" placeholder="Sin límite" />
      </div>
      <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Spinner /> : <Link2 aria-hidden="true" />}
        Crear enlace
      </Button>
    </form>
  );
}

export function EmailInviteForm({ groupId }: { groupId: string }) {
  const form = useForm({ resolver: zodResolver(emailInviteSchema), defaultValues: { email: "" } });

  async function onSubmit(values: { email: string }) {
    const result = await sendEmailInvite(groupId, values);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Invitación enviada a ${values.email}`);
    form.reset({ email: "" });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <TextField
        control={form.control}
        name="email"
        id="invite-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="amigo@ejemplo.com"
      />
      <Button type="submit" size="lg" variant="outline" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Spinner /> : <Send aria-hidden="true" />}
        Enviar invitación
      </Button>
    </form>
  );
}

export function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={disabled}
      onClick={async () => {
        if (await copy(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast.error("No se ha podido copiar. Mantén pulsado el enlace para copiarlo.");
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

export function RevokeButton({ groupId, inviteId, compact }: { groupId: string; inviteId: string; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="lg"
      className="text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeInvite(groupId, inviteId);
          if (!result.ok) toast.error(result.error);
          else toast.success("Invitación anulada");
        })
      }
    >
      {pending && <Spinner />}
      {compact ? "Anular" : "Anular enlace"}
    </Button>
  );
}
