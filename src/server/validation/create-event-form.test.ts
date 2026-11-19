import { describe, expect, it } from "vitest";
import { validateEventDraft } from "@/domain/rubric";
import {
  MAX_FORM_FIELD_LENGTH,
  MAX_FORM_ROWS,
  parseCreateEventForm,
} from "@/server/validation/create-event-form";

type FormFields = {
  name?: string;
  judgesPerTeam?: string;
  scaleMin?: string;
  scaleMax?: string;
  criterionNames?: string[];
  criterionWeights?: string[];
};

function buildForm(fields: FormFields): FormData {
  const formData = new FormData();
  if (fields.name !== undefined) formData.append("name", fields.name);
  if (fields.judgesPerTeam !== undefined)
    formData.append("judgesPerTeam", fields.judgesPerTeam);
  if (fields.scaleMin !== undefined)
    formData.append("scaleMin", fields.scaleMin);
  if (fields.scaleMax !== undefined)
    formData.append("scaleMax", fields.scaleMax);
  for (const name of fields.criterionNames ?? []) {
    formData.append("criterionName", name);
  }
  for (const weight of fields.criterionWeights ?? []) {
    formData.append("criterionWeight", weight);
  }
  return formData;
}

function parseValue(fields: FormFields) {
  const result = parseCreateEventForm(buildForm(fields));
  if (!result.ok) {
    throw new Error(`expected ok, got ${result.error}`);
  }
  return result.value;
}

describe("parseCreateEventForm", () => {
  it("maps the name, settings, and criteria in entered order", () => {
    expect(
      parseValue({
        name: "Demo Day",
        judgesPerTeam: "5",
        scaleMin: "0",
        scaleMax: "100",
        criterionNames: ["Impact", "Design", "Demo"],
        criterionWeights: ["50", "30", "20"],
      }),
    ).toEqual({
      name: "Demo Day",
      judgesPerTeam: 5,
      scaleMin: 0,
      scaleMax: 100,
      criteria: [
        { name: "Impact", weight: 50 },
        { name: "Design", weight: 30 },
        { name: "Demo", weight: 20 },
      ],
    });
  });

  it("leaves names untrimmed so the domain decides", () => {
    const value = parseValue({
      name: "  Demo Day ",
      criterionNames: [" design "],
      criterionWeights: ["100"],
    });
    expect(value.name).toBe("  Demo Day ");
    expect(value.criteria[0]?.name).toBe(" design ");
  });

  it("turns blank or whitespace-only settings into undefined", () => {
    const value = parseValue({
      name: "Demo Day",
      judgesPerTeam: "",
      scaleMin: "   ",
      scaleMax: "",
      criterionNames: [],
      criterionWeights: [],
    });
    expect(value.judgesPerTeam).toBeUndefined();
    expect(value.scaleMin).toBeUndefined();
    expect(value.scaleMax).toBeUndefined();
  });

  it("turns missing settings into undefined", () => {
    const value = parseValue({ name: "Demo Day" });
    expect(value.judgesPerTeam).toBeUndefined();
    expect(value.scaleMin).toBeUndefined();
    expect(value.scaleMax).toBeUndefined();
    expect(value.criteria).toEqual([]);
  });

  it("parses integer strings, ignoring surrounding whitespace", () => {
    const value = parseValue({
      name: "Demo Day",
      judgesPerTeam: " 4 ",
      scaleMin: "-1",
      scaleMax: "007",
      criterionNames: ["Impact"],
      criterionWeights: [" 100 "],
    });
    expect(value.judgesPerTeam).toBe(4);
    expect(value.scaleMin).toBe(-1);
    expect(value.scaleMax).toBe(7);
    expect(value.criteria[0]?.weight).toBe(100);
  });

  it.each(["2.5", "abc", "1e2", "0x10", "+5", "5 5", "--1", "１０"])(
    "turns the non-integer %j into NaN",
    (raw) => {
      const value = parseValue({
        name: "Demo Day",
        judgesPerTeam: raw,
        scaleMin: raw,
        scaleMax: raw,
        criterionNames: ["Impact"],
        criterionWeights: [raw],
      });
      expect(value.judgesPerTeam).toBeNaN();
      expect(value.scaleMin).toBeNaN();
      expect(value.scaleMax).toBeNaN();
      expect(value.criteria[0]?.weight).toBeNaN();
    },
  );

  it("turns a blank weight into NaN, because weights are required", () => {
    const value = parseValue({
      name: "Demo Day",
      criterionNames: ["Impact", "Design"],
      criterionWeights: ["", "  "],
    });
    expect(value.criteria.map((c) => c.weight)).toEqual([NaN, NaN]);
  });

  it("feeds blank settings through to the domain defaults (AC3)", () => {
    const result = validateEventDraft(
      parseValue({
        name: "Demo Day",
        judgesPerTeam: "",
        scaleMin: "",
        scaleMax: "",
        criterionNames: ["Impact"],
        criterionWeights: ["100"],
      }),
    );
    expect(result.ok && result.value).toMatchObject({
      judgesPerTeam: 3,
      scaleMin: 1,
      scaleMax: 10,
    });
  });

  it(`accepts exactly ${MAX_FORM_ROWS} rows and fields of ${MAX_FORM_FIELD_LENGTH} characters`, () => {
    const result = parseCreateEventForm(
      buildForm({
        name: "x".repeat(MAX_FORM_FIELD_LENGTH),
        criterionNames: Array.from(
          { length: MAX_FORM_ROWS },
          (_, i) => `C${i}`,
        ),
        criterionWeights: Array.from({ length: MAX_FORM_ROWS }, () => "2"),
      }),
    );
    expect(result.ok).toBe(true);
  });

  describe("rejects payloads no browser would send as invalid_request", () => {
    const invalid = { ok: false, error: "invalid_request" };

    it("a missing event name", () => {
      expect(parseCreateEventForm(buildForm({}))).toEqual(invalid);
    });

    it("more names than weights", () => {
      expect(
        parseCreateEventForm(
          buildForm({
            name: "Demo Day",
            criterionNames: ["Impact", "Design"],
            criterionWeights: ["100"],
          }),
        ),
      ).toEqual(invalid);
    });

    it("more weights than names", () => {
      expect(
        parseCreateEventForm(
          buildForm({
            name: "Demo Day",
            criterionNames: ["Impact"],
            criterionWeights: ["50", "50"],
          }),
        ),
      ).toEqual(invalid);
    });

    it(`more than ${MAX_FORM_ROWS} rows`, () => {
      const count = MAX_FORM_ROWS + 1;
      expect(
        parseCreateEventForm(
          buildForm({
            name: "Demo Day",
            criterionNames: Array.from({ length: count }, (_, i) => `C${i}`),
            criterionWeights: Array.from({ length: count }, () => "1"),
          }),
        ),
      ).toEqual(invalid);
    });

    it(`a field longer than ${MAX_FORM_FIELD_LENGTH} characters`, () => {
      expect(
        parseCreateEventForm(
          buildForm({ name: "x".repeat(MAX_FORM_FIELD_LENGTH + 1) }),
        ),
      ).toEqual(invalid);
      expect(
        parseCreateEventForm(
          buildForm({
            name: "Demo Day",
            criterionNames: ["y".repeat(MAX_FORM_FIELD_LENGTH + 1)],
            criterionWeights: ["100"],
          }),
        ),
      ).toEqual(invalid);
    });

    it("a file where text is expected", () => {
      const formData = buildForm({ criterionNames: [], criterionWeights: [] });
      formData.append("name", new Blob(["Demo Day"]), "name.txt");
      expect(parseCreateEventForm(formData)).toEqual(invalid);

      const withFileWeight = buildForm({
        name: "Demo Day",
        criterionNames: ["Impact"],
      });
      withFileWeight.append("criterionWeight", new Blob(["100"]), "w.txt");
      expect(parseCreateEventForm(withFileWeight)).toEqual(invalid);
    });
  });
});

describe("parseCreateEventForm entered values", () => {
  function parseEntered(fields: FormFields) {
    const result = parseCreateEventForm(buildForm(fields));
    if (!result.ok) {
      throw new Error(`expected ok, got ${result.error}`);
    }
    return result.entered;
  }

  it("returns every field exactly as submitted, untrimmed and unparsed", () => {
    expect(
      parseEntered({
        name: "  Demo Day ",
        judgesPerTeam: " 4 ",
        scaleMin: "abc",
        scaleMax: "2.5",
        criterionNames: [" design ", "", "Impact"],
        criterionWeights: ["90", "", "-5"],
      }),
    ).toEqual({
      name: "  Demo Day ",
      judgesPerTeam: " 4 ",
      scaleMin: "abc",
      scaleMax: "2.5",
      criteria: [
        { name: " design ", weight: "90" },
        { name: "", weight: "" },
        { name: "Impact", weight: "-5" },
      ],
    });
  });

  it("returns missing settings as empty strings", () => {
    const entered = parseEntered({ name: "Demo Day" });
    expect(entered.judgesPerTeam).toBe("");
    expect(entered.scaleMin).toBe("");
    expect(entered.scaleMax).toBe("");
  });

  it("returns no criteria when every row was removed", () => {
    expect(parseEntered({ name: "Demo Day" }).criteria).toEqual([]);
  });

  it("keeps rows in the same order as the parsed criteria", () => {
    const result = parseCreateEventForm(
      buildForm({
        name: "Demo Day",
        criterionNames: ["Impact", "Design", "Demo"],
        criterionWeights: ["50", "x", "20"],
      }),
    );
    if (!result.ok) {
      throw new Error(`expected ok, got ${result.error}`);
    }
    expect(result.entered.criteria.map((c) => c.name)).toEqual(
      result.value.criteria.map((c) => c.name),
    );
    expect(result.value.criteria[1]?.weight).toBeNaN();
    expect(result.entered.criteria[1]?.weight).toBe("x");
  });
});
