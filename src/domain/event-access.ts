export type EventRole = "ORGANIZER" | "JUDGE" | "TEAM";

export type EventMembership = { eventId: string; role: EventRole };

/**
 * True when one of the user's memberships is in this event and holds one of
 * the allowed roles. Memberships in other events never count.
 */
export function hasEventRole(
  memberships: readonly EventMembership[],
  eventId: string,
  allowed: readonly EventRole[],
): boolean {
  return memberships.some(
    (membership) =>
      membership.eventId === eventId && allowed.includes(membership.role),
  );
}
