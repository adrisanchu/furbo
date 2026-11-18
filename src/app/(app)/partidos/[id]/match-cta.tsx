"use client";

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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { joinMatch, leaveMatch } from "@/server/actions/matches";

export type CtaState =
  | { kind: "join"; hint: string; sub: string; label: string }
  | { kind: "leave"; hint: string; sub: string; label: string; warning: string | null }
  | { kind: "info"; hint: string; sub: string };

/** Sticky bottom bar: the one thing to do on this match (join / leave). */
export function MatchCta({ matchId, state }: { matchId: string; state: CtaState }) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function join() {
    startTransition(async () => {
      const result = await joinMatch(matchId);
      if (!result.ok) return void toast.error(result.error);
      const o = result.data;
      if (o.status === "waitlist") toast.success(`Estás el ${o.position}.º en la lista de espera`);
      else if (o.closed) toast.success("¡Dentro! Con tu plaza se completa el partido");
      else toast.success("¡Dentro! Te esperamos en el campo");
    });
  }

  function leave() {
    startTransition(async () => {
      const result = await leaveMatch(matchId);
      if (!result.ok) return void toast.error(result.error);
      if (result.data.promotedUserId) toast.success("Te has borrado. El primero de la lista de espera ocupa tu plaza.");
      else if (result.data.keptDebt) toast.success("Te has borrado. Tu parte sigue pendiente.");
      else toast.success("Te has borrado del partido");
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold">{state.hint}</span>
          <span className="truncate text-[13px] text-muted-foreground">{state.sub}</span>
        </div>
        {state.kind === "join" && (
          <Button size="lg" className="h-12 min-w-36 halo" disabled={pending} onClick={join}>
            {pending && <Spinner />}
            {state.label}
          </Button>
        )}
        {state.kind === "leave" && (
          <Button
            size="lg"
            variant="outline"
            className={cn("h-12 min-w-28")}
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            {pending && <Spinner />}
            {state.label}
          </Button>
        )}
      </div>

      {state.kind === "leave" && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿{state.label}?</AlertDialogTitle>
              <AlertDialogDescription>
                {state.warning ?? "Liberarás tu plaza para otra persona."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel size="lg">Me quedo</AlertDialogCancel>
              <AlertDialogAction size="lg" variant="destructive" onClick={leave}>
                {state.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
