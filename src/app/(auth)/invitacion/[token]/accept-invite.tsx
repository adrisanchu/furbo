"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { acceptInvite } from "@/server/actions/groups";

export function AcceptInvite({ token, needsOnboarding }: { token: string; needsOnboarding: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="xl"
      className="halo"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptInvite(token);
          if (!result.ok) return void toast.error(result.error);
          toast.success("¡Ya estás dentro!");
          const group = `/grupos/${result.data.groupId}`;
          // New players set their level first, then land on the group.
          router.replace(needsOnboarding ? `/bienvenida?next=${encodeURIComponent(group)}` : group);
          router.refresh();
        })
      }
    >
      {pending && <Spinner />}
      Unirme al grupo
    </Button>
  );
}
