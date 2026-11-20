import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { hasEventRole, type EventRole } from "@/domain/event-access";
import { db } from "@/server/db";

const eventIdSchema = z.cuid();

/**
 * Authenticates the request. A signed-out page request is redirected to
 * Clerk's hosted sign-in; a signed-out Server Action request gets a 401.
 */
export async function requireUser(): Promise<{ userId: string }> {
  const { userId } = await auth.protect();
  return { userId };
}

/**
 * Authenticates, then requires one of `roles` in this event. A malformed ID,
 * a nonexistent event, and a missing role all get the same 404, so event IDs
 * can't be probed. Never wrap a call to this in try/catch: notFound() throws.
 */
export async function requireEventRole(
  eventId: unknown,
  roles: readonly EventRole[],
): Promise<{ userId: string; eventId: string }> {
  const { userId } = await requireUser();

  const parsed = eventIdSchema.safeParse(eventId);
  if (!parsed.success) {
    logDenial({ reason: "invalid_event_id", eventId: null, required: roles });
    notFound();
  }

  const memberships = await db.eventMember.findMany({
    where: { eventId: parsed.data, userId },
    select: { eventId: true, role: true },
  });
  if (!hasEventRole(memberships, parsed.data, roles)) {
    logDenial({
      reason: "missing_role",
      eventId: parsed.data,
      required: roles,
    });
    notFound();
  }

  return { userId, eventId: parsed.data };
}

/** Logs an authorization denial without the user ID or other personal data. */
function logDenial(details: {
  reason: "invalid_event_id" | "missing_role";
  eventId: string | null;
  required: readonly EventRole[];
}): void {
  console.warn(JSON.stringify({ msg: "authz_denied", ...details }));
}
