import { describe, expect, it } from "vitest";
import { weightedScore } from "@/domain/scoring";

describe("weightedScore", () => {
  it("computes the AC1 example: weights 50/30/20 with scores 8/6/10 give 7.8", () => {
    const result = weightedScore([
      { weight: 50, score: 8 },
      { weight: 30, score: 6 },
      { weight: 20, score: 10 },
    ]);

    expect(result).toBeCloseTo(7.8, 9);
  });

  it("returns the score itself when a single criterion carries weight 100", () => {
    expect(weightedScore([{ weight: 100, score: 7 }])).toBeCloseTo(7, 9);
  });

  it("returns the common score when every criterion has the same score", () => {
    const result = weightedScore([
      { weight: 25, score: 4 },
      { weight: 25, score: 4 },
      { weight: 50, score: 4 },
    ]);

    expect(result).toBeCloseTo(4, 9);
  });

  it("computes sum(weight x score) / 100 for uneven weights", () => {
    // (10*1 + 15*2 + 75*9) / 100 = (10 + 30 + 675) / 100 = 7.15
    const result = weightedScore([
      { weight: 10, score: 1 },
      { weight: 15, score: 2 },
      { weight: 75, score: 9 },
    ]);

    expect(result).toBeCloseTo(7.15, 9);
  });
});
