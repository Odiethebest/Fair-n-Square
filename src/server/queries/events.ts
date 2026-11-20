import { notFound } from "next/navigation";
import type { EventStatus } from "@/domain/rubric";
import { requireEventRole } from "@/server/auth";
import { db } from "@/server/db";

export type ManageEventDto = {
  id: string;
  name: string;
  status: EventStatus;
  judgesPerTeam: number;
  scaleMin: number;
  scaleMax: number;
  criteria: { name: string; weight: number }[];
};

/** The organizer's view of one event: settings and rubric in entered order. */
export async function getManageEvent(
  eventId: unknown,
): Promise<ManageEventDto> {
  const access = await requireEventRole(eventId, ["ORGANIZER"]);

  const event = await db.event.findUnique({
    where: { id: access.eventId },
    select: {
      id: true,
      name: true,
      status: true,
      judgesPerTeam: true,
      scaleMin: true,
      scaleMax: true,
      criteria: {
        orderBy: { position: "asc" },
        select: { name: true, weight: true },
      },
    },
  });
  if (!event) {
    // Deleted between the role check and this read.
    notFound();
  }

  return {
    id: event.id,
    name: event.name,
    status: event.status,
    judgesPerTeam: event.judgesPerTeam,
    scaleMin: event.scaleMin,
    scaleMax: event.scaleMax,
    criteria: event.criteria.map((c) => ({ name: c.name, weight: c.weight })),
  };
}
