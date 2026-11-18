"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setPaid } from "@/server/actions/matches";

/** Admin switch: mark a player's share as paid (PRD §5.6). */
export function PaymentToggle({
  matchId,
  userId,
  name,
  paid,
}: {
  matchId: string;
  userId: string;
  name: string;
  paid: boolean;
}) {
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(paid);
  const [, startTransition] = useTransition();
  return (
    <Switch
      checked={optimisticPaid}
      aria-label={`${name} ha pagado`}
      className="scale-125"
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setOptimisticPaid(checked);
          const result = await setPaid(matchId, userId, checked);
          if (!result.ok) toast.error(result.error);
        })
      }
    />
  );
}
