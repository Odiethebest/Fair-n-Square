"use server";

import { redirect } from "next/navigation";
import { validateEventDraft } from "@/domain/rubric";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  parseCreateEventForm,
  type CreateEventState,
} from "@/server/validation/create-event-form";

/**
 * Creates a DRAFT event with its rubric and makes the caller its organizer,
 * then redirects to the manage page. Any signed-in user may create an event,
 * so there is no event role to check yet. On a validation failure nothing is
 * saved, and the errors go back to the form with the values as submitted.
 */
export async function createEvent(
  _prevState: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const { userId } = await requireUser();

  const form = parseCreateEventForm(formData);
  if (!form.ok) {
    return { errors: [{ code: form.error, path: [] }] };
  }

  const draft = validateEventDraft(form.value);
  if (!draft.ok) {
    return { errors: draft.errors, entered: form.entered };
  }

  // One nested write, so the event, its criteria, and the organizer
  // membership are saved together or not at all.
  const event = await db.event.create({
    data: {
      name: draft.value.name,
      status: draft.value.status,
      judgesPerTeam: draft.value.judgesPerTeam,
      scaleMin: draft.value.scaleMin,
      scaleMax: draft.value.scaleMax,
      criteria: {
        create: draft.value.criteria.map((criterion) => ({
          name: criterion.name,
          weight: criterion.weight,
          position: criterion.position,
        })),
      },
      members: { create: { userId, role: "ORGANIZER" } },
    },
    select: { id: true },
  });

  redirect(`/events/${event.id}/manage`);
}
