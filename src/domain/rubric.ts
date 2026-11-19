export const TOTAL_WEIGHT = 100;
export const MIN_CRITERIA = 1;
export const MAX_CRITERIA = 10;
export const MAX_EVENT_NAME_LENGTH = 100;
export const MAX_CRITERION_NAME_LENGTH = 60;
export const DEFAULT_JUDGES_PER_TEAM = 3;
export const MIN_JUDGES_PER_TEAM = 1;
export const MAX_JUDGES_PER_TEAM = 10;
export const DEFAULT_SCALE_MIN = 1;
export const DEFAULT_SCALE_MAX = 10;
export const SCALE_LOWER_BOUND = 0;
export const SCALE_UPPER_BOUND = 100;

export type EventStatus = "DRAFT" | "JUDGING" | "CLOSED" | "RELEASED";

export type CriterionInput = { name: string; weight: number };

/** Raw organizer input. Numbers may be NaN or non-integers; validation decides. */
export type EventDraftInput = {
  name: string;
  judgesPerTeam?: number;
  scaleMin?: number;
  scaleMax?: number;
  criteria: readonly CriterionInput[];
};

export type DraftCriterion = { name: string; weight: number; position: number };

export type EventDraft = {
  name: string;
  status: "DRAFT";
  judgesPerTeam: number;
  scaleMin: number;
  scaleMax: number;
  criteria: DraftCriterion[];
};

export type RubricErrorCode =
  | "event_name_required"
  | "event_name_too_long"
  | "criteria_missing"
  | "criteria_too_many"
  | "criterion_name_required"
  | "criterion_name_too_long"
  | "criterion_name_duplicate"
  | "criterion_weight_invalid"
  | "weights_sum_not_100"
  | "judges_per_team_invalid"
  | "scale_min_invalid"
  | "scale_max_invalid"
  | "scale_min_not_below_max";

export type RubricError = { code: RubricErrorCode; path: (string | number)[] };

export type EventDraftResult =
  { ok: true; value: EventDraft } | { ok: false; errors: RubricError[] };

/**
 * Validates an organizer's event and rubric, applies defaults, and reports
 * every failure at once as `{ code, path }`.
 */
export function validateEventDraft(input: EventDraftInput): EventDraftResult {
  const name = input.name.trim();
  const judgesPerTeam = input.judgesPerTeam ?? DEFAULT_JUDGES_PER_TEAM;
  const scaleMin = input.scaleMin ?? DEFAULT_SCALE_MIN;
  const scaleMax = input.scaleMax ?? DEFAULT_SCALE_MAX;
  const criteria = validateCriteria(input.criteria);

  const errors: RubricError[] = [
    ...validateEventName(name),
    ...criteria.errors,
    ...validateSettings(judgesPerTeam, scaleMin, scaleMax),
  ];
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      status: "DRAFT",
      judgesPerTeam,
      scaleMin,
      scaleMax,
      criteria: criteria.value,
    },
  };
}

function validateEventName(name: string): RubricError[] {
  if (name.length === 0) {
    return [{ code: "event_name_required", path: ["name"] }];
  }
  if (name.length > MAX_EVENT_NAME_LENGTH) {
    return [{ code: "event_name_too_long", path: ["name"] }];
  }
  return [];
}

function validateCriteria(criteria: readonly CriterionInput[]): {
  value: DraftCriterion[];
  errors: RubricError[];
} {
  if (criteria.length < MIN_CRITERIA) {
    return {
      value: [],
      errors: [{ code: "criteria_missing", path: ["criteria"] }],
    };
  }

  const errors: RubricError[] = [];
  if (criteria.length > MAX_CRITERIA) {
    errors.push({ code: "criteria_too_many", path: ["criteria"] });
  }

  const seenNames = new Set<string>();
  const value = criteria.map((criterion, position): DraftCriterion => {
    const name = criterion.name.trim();
    const key = name.toLowerCase();
    if (name.length === 0) {
      errors.push({
        code: "criterion_name_required",
        path: ["criteria", position, "name"],
      });
    } else if (name.length > MAX_CRITERION_NAME_LENGTH) {
      errors.push({
        code: "criterion_name_too_long",
        path: ["criteria", position, "name"],
      });
    } else if (seenNames.has(key)) {
      errors.push({
        code: "criterion_name_duplicate",
        path: ["criteria", position, "name"],
      });
    }
    if (name.length > 0) {
      seenNames.add(key);
    }

    if (!isPositiveInteger(criterion.weight)) {
      errors.push({
        code: "criterion_weight_invalid",
        path: ["criteria", position, "weight"],
      });
    }
    return { name, weight: criterion.weight, position };
  });

  const allWeightsValid = criteria.every((c) => isPositiveInteger(c.weight));
  const total = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (allWeightsValid && total !== TOTAL_WEIGHT) {
    errors.push({ code: "weights_sum_not_100", path: ["criteria"] });
  }

  return { value, errors };
}

function validateSettings(
  judgesPerTeam: number,
  scaleMin: number,
  scaleMax: number,
): RubricError[] {
  const errors: RubricError[] = [];
  if (
    !isIntegerInRange(judgesPerTeam, MIN_JUDGES_PER_TEAM, MAX_JUDGES_PER_TEAM)
  ) {
    errors.push({ code: "judges_per_team_invalid", path: ["judgesPerTeam"] });
  }

  const minValid = isIntegerInRange(
    scaleMin,
    SCALE_LOWER_BOUND,
    SCALE_UPPER_BOUND,
  );
  const maxValid = isIntegerInRange(
    scaleMax,
    SCALE_LOWER_BOUND,
    SCALE_UPPER_BOUND,
  );
  if (!minValid) {
    errors.push({ code: "scale_min_invalid", path: ["scaleMin"] });
  }
  if (!maxValid) {
    errors.push({ code: "scale_max_invalid", path: ["scaleMax"] });
  }
  if (minValid && maxValid && scaleMin >= scaleMax) {
    errors.push({ code: "scale_min_not_below_max", path: ["scaleMax"] });
  }
  return errors;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
