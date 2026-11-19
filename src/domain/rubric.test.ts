import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  MAX_CRITERIA,
  MAX_CRITERION_NAME_LENGTH,
  MAX_EVENT_NAME_LENGTH,
  validateEventDraft,
  type CriterionInput,
  type EventDraftInput,
  type RubricError,
} from "@/domain/rubric";

function input(overrides: Partial<EventDraftInput> = {}): EventDraftInput {
  return {
    name: "Demo Day",
    criteria: [
      { name: "Impact", weight: 50 },
      { name: "Design", weight: 30 },
      { name: "Demo", weight: 20 },
    ],
    ...overrides,
  };
}

function expectOnlyErrors(draft: EventDraftInput, errors: RubricError[]) {
  expect(validateEventDraft(draft)).toEqual({ ok: false, errors });
}

describe("validateEventDraft: valid drafts (AC1, AC3)", () => {
  it("creates a DRAFT event with trimmed names and criteria in entered order", () => {
    const result = validateEventDraft(
      input({
        name: "  Demo Day  ",
        criteria: [
          { name: " Impact ", weight: 50 },
          { name: "Design", weight: 30 },
          { name: "Demo  ", weight: 20 },
        ],
      }),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        name: "Demo Day",
        status: "DRAFT",
        judgesPerTeam: 3,
        scaleMin: 1,
        scaleMax: 10,
        criteria: [
          { name: "Impact", weight: 50, position: 0 },
          { name: "Design", weight: 30, position: 1 },
          { name: "Demo", weight: 20, position: 2 },
        ],
      },
    });
  });

  it("defaults judgesPerTeam to 3 and the scale to 1-10 when they are blank", () => {
    const result = validateEventDraft(input());

    expect(result).toMatchObject({
      ok: true,
      value: { judgesPerTeam: 3, scaleMin: 1, scaleMax: 10 },
    });
  });

  it("accepts custom settings at the bounds: k = 1 and 10, scale 0-100", () => {
    for (const judgesPerTeam of [1, 5, 10]) {
      const result = validateEventDraft(
        input({ judgesPerTeam, scaleMin: 0, scaleMax: 100 }),
      );
      expect(result).toMatchObject({
        ok: true,
        value: { judgesPerTeam, scaleMin: 0, scaleMax: 100 },
      });
    }
  });

  it("applies each scale default separately: min 5 with max blank is 5-10", () => {
    expect(validateEventDraft(input({ scaleMin: 5 }))).toMatchObject({
      ok: true,
      value: { scaleMin: 5, scaleMax: 10 },
    });
  });

  it("accepts a single criterion weighted 100", () => {
    expect(
      validateEventDraft(
        input({ criteria: [{ name: "Overall", weight: 100 }] }),
      ),
    ).toMatchObject({ ok: true });
  });

  it("accepts the maximum number of criteria", () => {
    const criteria = Array.from({ length: MAX_CRITERIA }, (_, i) => ({
      name: `Criterion ${i + 1}`,
      weight: 100 / MAX_CRITERIA,
    }));
    expect(validateEventDraft(input({ criteria }))).toMatchObject({ ok: true });
  });

  it("accepts names at their maximum lengths after trimming", () => {
    const result = validateEventDraft(
      input({
        name: ` ${"e".repeat(MAX_EVENT_NAME_LENGTH)} `,
        criteria: [
          { name: ` ${"c".repeat(MAX_CRITERION_NAME_LENGTH)} `, weight: 100 },
        ],
      }),
    );
    expect(result).toMatchObject({ ok: true });
  });
});

describe("validateEventDraft: rubric failures (AC2)", () => {
  it("rejects weights that do not sum to 100", () => {
    for (const last of [10, 30]) {
      expectOnlyErrors(
        input({
          criteria: [
            { name: "Impact", weight: 50 },
            { name: "Design", weight: 30 },
            { name: "Demo", weight: last },
          ],
        }),
        [{ code: "weights_sum_not_100", path: ["criteria"] }],
      );
    }
  });

  it.each([0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects weight %s as not a positive integer, without a sum error",
    (weight) => {
      expectOnlyErrors(
        input({
          criteria: [
            { name: "Impact", weight: 50 },
            { name: "Design", weight: 30 },
            { name: "Demo", weight },
          ],
        }),
        [{ code: "criterion_weight_invalid", path: ["criteria", 2, "weight"] }],
      );
    },
  );

  it.each(["", "   "])("rejects criterion name %j as empty", (name) => {
    expectOnlyErrors(
      input({
        criteria: [
          { name: "Impact", weight: 50 },
          { name, weight: 50 },
        ],
      }),
      [{ code: "criterion_name_required", path: ["criteria", 1, "name"] }],
    );
  });

  it("rejects a criterion name longer than the limit", () => {
    expectOnlyErrors(
      input({
        criteria: [
          { name: "c".repeat(MAX_CRITERION_NAME_LENGTH + 1), weight: 100 },
        ],
      }),
      [{ code: "criterion_name_too_long", path: ["criteria", 0, "name"] }],
    );
  });

  it("rejects duplicate criterion names, ignoring case and surrounding spaces", () => {
    expectOnlyErrors(
      input({
        criteria: [
          { name: "Impact", weight: 50 },
          { name: "Design", weight: 30 },
          { name: " design ", weight: 20 },
        ],
      }),
      [{ code: "criterion_name_duplicate", path: ["criteria", 2, "name"] }],
    );
  });

  it("flags every row that repeats an earlier name", () => {
    expectOnlyErrors(
      input({
        criteria: [
          { name: "Impact", weight: 40 },
          { name: "IMPACT", weight: 30 },
          { name: "impact", weight: 30 },
        ],
      }),
      [
        { code: "criterion_name_duplicate", path: ["criteria", 1, "name"] },
        { code: "criterion_name_duplicate", path: ["criteria", 2, "name"] },
      ],
    );
  });

  it("does not report empty names as duplicates of each other", () => {
    expectOnlyErrors(
      input({
        criteria: [
          { name: "", weight: 50 },
          { name: " ", weight: 50 },
        ],
      }),
      [
        { code: "criterion_name_required", path: ["criteria", 0, "name"] },
        { code: "criterion_name_required", path: ["criteria", 1, "name"] },
      ],
    );
  });

  it("rejects a rubric with no criteria", () => {
    expectOnlyErrors(input({ criteria: [] }), [
      { code: "criteria_missing", path: ["criteria"] },
    ]);
  });

  it("rejects more criteria than the maximum", () => {
    const criteria: CriterionInput[] = Array.from(
      { length: MAX_CRITERIA + 1 },
      (_, i) => ({ name: `Criterion ${i + 1}`, weight: i === 0 ? 10 : 9 }),
    );
    expectOnlyErrors(input({ criteria }), [
      { code: "criteria_too_many", path: ["criteria"] },
    ]);
  });

  it.each(["", "   "])("rejects event name %j as empty", (name) => {
    expectOnlyErrors(input({ name }), [
      { code: "event_name_required", path: ["name"] },
    ]);
  });

  it("rejects an event name longer than the limit", () => {
    expectOnlyErrors(input({ name: "e".repeat(MAX_EVENT_NAME_LENGTH + 1) }), [
      { code: "event_name_too_long", path: ["name"] },
    ]);
  });

  it("reports every failure at once", () => {
    const result = validateEventDraft({
      name: " ",
      judgesPerTeam: 0,
      scaleMin: 10,
      scaleMax: 1,
      criteria: [
        { name: "Impact", weight: 60 },
        { name: "impact", weight: 30 },
        { name: "", weight: 10 },
      ],
    });

    expect(result.ok).toBe(false);
    const errors = result.ok ? [] : result.errors;
    expect(errors).toHaveLength(5);
    expect(errors).toEqual(
      expect.arrayContaining([
        { code: "event_name_required", path: ["name"] },
        { code: "criterion_name_duplicate", path: ["criteria", 1, "name"] },
        { code: "criterion_name_required", path: ["criteria", 2, "name"] },
        { code: "judges_per_team_invalid", path: ["judgesPerTeam"] },
        { code: "scale_min_not_below_max", path: ["scaleMax"] },
      ]),
    );
  });
});

describe("validateEventDraft: settings failures (AC3)", () => {
  it.each([0, 11, 2.5, Number.NaN])(
    "rejects judgesPerTeam %s",
    (judgesPerTeam) => {
      expectOnlyErrors(input({ judgesPerTeam }), [
        { code: "judges_per_team_invalid", path: ["judgesPerTeam"] },
      ]);
    },
  );

  it.each([-1, 101, 2.5, Number.NaN])("rejects scaleMin %s", (scaleMin) => {
    expectOnlyErrors(input({ scaleMin, scaleMax: 100 }), [
      { code: "scale_min_invalid", path: ["scaleMin"] },
    ]);
  });

  it.each([-1, 101, 2.5, Number.NaN])("rejects scaleMax %s", (scaleMax) => {
    expectOnlyErrors(input({ scaleMin: 0, scaleMax }), [
      { code: "scale_max_invalid", path: ["scaleMax"] },
    ]);
  });

  it.each([
    [5, 5],
    [10, 1],
  ])(
    "rejects scale %s-%s because min is not below max",
    (scaleMin, scaleMax) => {
      expectOnlyErrors(input({ scaleMin, scaleMax }), [
        { code: "scale_min_not_below_max", path: ["scaleMax"] },
      ]);
    },
  );

  it("checks min < max after defaults: min 10 with max blank fails", () => {
    expectOnlyErrors(input({ scaleMin: 10 }), [
      { code: "scale_min_not_below_max", path: ["scaleMax"] },
    ]);
  });
});

describe("validateEventDraft: property", () => {
  const criterionName = fc
    .string({ minLength: 1, maxLength: MAX_CRITERION_NAME_LENGTH })
    .filter((name) => name.trim() === name && name.length > 0);

  const validCriteria = fc
    .uniqueArray(criterionName, {
      minLength: 1,
      maxLength: MAX_CRITERIA,
      selector: (name) => name.toLowerCase(),
    })
    .chain((names) =>
      fc
        .uniqueArray(fc.integer({ min: 1, max: 99 }), {
          minLength: names.length - 1,
          maxLength: names.length - 1,
        })
        .map((cuts) => {
          const points = [0, ...[...cuts].sort((a, b) => a - b), 100];
          return names.map((name, i) => ({
            name,
            weight: points[i + 1] - points[i],
          }));
        }),
    );

  it("accepts any 1-10 unique names with positive integer weights summing to 100, keeping order", () => {
    fc.assert(
      fc.property(validCriteria, (criteria) => {
        const result = validateEventDraft({ name: "Demo Day", criteria });
        expect(result.ok).toBe(true);
        expect(result.ok && result.value.criteria).toEqual(
          criteria.map((c, position) => ({ ...c, position })),
        );
      }),
    );
  });
});
