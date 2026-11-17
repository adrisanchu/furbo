"use client";

import { EllipsisVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { removeMember, setMemberRole } from "@/server/actions/groups";

/** Admin menu on a member row: promote/demote, remove from the group. */
export function MemberActions({
  groupId,
  userId,
  name,
  role,
}: {
  groupId: string;
  userId: string;
  name: string;
  role: "admin" | "member";
}) {
  const [pending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error((result as { error: string }).error);
      else toast.success(success);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label={`Opciones para ${name}`} disabled={pending}>
            {pending ? <Spinner /> : <EllipsisVertical />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {role === "member" ? (
            <DropdownMenuItem onSelect={() => run(() => setMemberRole(groupId, userId, "admin"), `${name} ahora es admin`)}>
              Hacer admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => run(() => setMemberRole(groupId, userId, "member"), `${name} ya no es admin`)}>
              Quitar admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
            Expulsar del grupo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Expulsar a {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Saldrá de los próximos partidos y no podrá volver a entrar con un enlace. Solo una invitación por email
              puede readmitirle. Sus pagos pendientes se mantienen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg">Volver</AlertDialogCancel>
            <AlertDialogAction
              size="lg"
              variant="destructive"
              onClick={() => run(() => removeMember(groupId, userId), `${name} ya no está en el grupo`)}
            >
              Expulsar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
