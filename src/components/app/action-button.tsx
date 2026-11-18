"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ComponentProps, type ReactNode } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

type Props<T> = Omit<ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<Result<T>>;
  /** Toast on success (string or derived from the result). */
  success?: string | ((data: T) => string | null);
  /** Navigate after success. */
  redirectTo?: string | ((data: T) => string);
  /** Ask before running (destructive actions). */
  confirm?: { title: string; description: ReactNode; confirmLabel: string };
};

/** Button that runs a Server Action, shows a spinner and toasts the outcome. */
export function ActionButton<T>({ action, success, redirectTo, confirm, children, disabled, ...props }: Props<T>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const message = typeof success === "function" ? success(result.data) : success;
      if (message) toast.success(message);
      if (redirectTo) router.push(typeof redirectTo === "function" ? redirectTo(result.data) : redirectTo);
    });
  }

  const content = (
    <>
      {pending && <Spinner />}
      {children}
    </>
  );

  if (!confirm) {
    return (
      <Button {...props} disabled={disabled || pending} onClick={run}>
        {content}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button {...props} disabled={disabled || pending}>
          {content}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg">Volver</AlertDialogCancel>
          <AlertDialogAction size="lg" variant="destructive" onClick={run}>
            {confirm.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
