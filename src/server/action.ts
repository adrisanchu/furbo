import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { ActionError } from "./errors";

export { ActionError };

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Runs a Server Action body and turns expected failures into `{ ok: false }`.
 * Next.js control-flow errors (redirect, notFound) are re-thrown.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ActionError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Revisa los datos." };
    console.error(err);
    return { ok: false, error: "Algo ha fallado. Inténtalo de nuevo." };
  }
}

/** Validates an id coming from the client or the URL. */
export const idSchema = z.uuid("Identificador no válido");
