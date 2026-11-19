import { z } from "zod";
import type { EventDraftInput, RubricErrorCode } from "@/domain/rubric";

/** Payload sanity limits. The real rules live in src/domain/rubric.ts. */
export const MAX_FORM_ROWS = 50;
export const MAX_FORM_FIELD_LENGTH = 1_000;

const INTEGER_PATTERN = /^-?\d+$/;

const text = z.string().max(MAX_FORM_FIELD_LENGTH);
const rows = z.array(text).max(MAX_FORM_ROWS);

const createEventFormSchema = z
  .object({
    name: text,
    judgesPerTeam: text.nullable(),
    scaleMin: text.nullable(),
    scaleMax: text.nullable(),
    criterionNames: rows,
    criterionWeights: rows,
  })
  .refine(
    (form) => form.criterionNames.length === form.criterionWeights.length,
  );

export type CreateEventErrorCode = RubricErrorCode | "invalid_request";

export type CreateEventError = {
  code: CreateEventErrorCode;
  path: (string | number)[];
};

/** The form's fields exactly as submitted, so the form can show them again. */
export type EnteredValues = {
  name: string;
  judgesPerTeam: string;
  scaleMin: string;
  scaleMax: string;
  criteria: { name: string; weight: string }[];
};

/**
 * What the create-event action returns to the form after a failed submit.
 * `entered` echoes the submitted fields whenever they could be read, because
 * React may never have seen them: after a full-page POST the form renders
 * from scratch, and text typed before hydration never reaches React state.
 */
export type CreateEventState = {
  errors: CreateEventError[];
  entered?: EnteredValues;
};

export type ParseCreateEventFormResult =
  | { ok: true; value: EventDraftInput; entered: EnteredValues }
  | { ok: false; error: "invalid_request" };

/**
 * Turns the create-event form into domain input. Only the shape is checked
 * here: a blank optional setting becomes undefined, an integer string becomes
 * a number, and anything else becomes NaN so the domain reports it. A payload
 * no browser would send (missing fields, files, mismatched rows, oversized
 * values) is `invalid_request`. `entered` holds the same fields as raw strings.
 */
export function parseCreateEventForm(
  formData: FormData,
): ParseCreateEventFormResult {
  const parsed = createEventFormSchema.safeParse({
    name: formData.get("name"),
    judgesPerTeam: formData.get("judgesPerTeam"),
    scaleMin: formData.get("scaleMin"),
    scaleMax: formData.get("scaleMax"),
    criterionNames: formData.getAll("criterionName"),
    criterionWeights: formData.getAll("criterionWeight"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_request" };
  }

  const form = parsed.data;
  const criteria = form.criterionWeights.map((weight, position) => ({
    name: form.criterionNames[position] ?? "",
    weight,
  }));
  return {
    ok: true,
    value: {
      name: form.name,
      judgesPerTeam: toOptionalInteger(form.judgesPerTeam),
      scaleMin: toOptionalInteger(form.scaleMin),
      scaleMax: toOptionalInteger(form.scaleMax),
      criteria: criteria.map((criterion) => ({
        name: criterion.name,
        weight: toInteger(criterion.weight),
      })),
    },
    entered: {
      name: form.name,
      judgesPerTeam: form.judgesPerTeam ?? "",
      scaleMin: form.scaleMin ?? "",
      scaleMax: form.scaleMax ?? "",
      criteria,
    },
  };
}

function toOptionalInteger(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") {
    return undefined;
  }
  return toInteger(raw);
}

function toInteger(raw: string): number {
  const trimmed = raw.trim();
  return INTEGER_PATTERN.test(trimmed) ? Number(trimmed) : Number.NaN;
}
