import { describe, expect, it } from "vitest";
import {
  type Assignment,
  teamScores,
  weightedScore,
  zScores,
} from "@/domain/scoring";

function expectAllClose(
  actual: ReadonlyArray<number>,
  expected: ReadonlyArray<number>,
) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, i) => {
    expect(actual[i]).toBeCloseTo(value, 9);
  });
}

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

describe("zScores", () => {
  it("normalizes [2, 4, 4, 4, 5, 5, 7, 9] with mean 5 and population SD 2", () => {
    // mean = (2+4+4+4+5+5+7+9) / 8 = 40 / 8 = 5
    // squared deviations: 9, 1, 1, 1, 0, 0, 4, 16 -> sum 32
    // population variance = 32 / 8 = 4, SD = 2
    // (sample SD would be sqrt(32 / 7) ~= 2.138, so this case tells them apart)
    // z = (x - 5) / 2: -1.5, -0.5, -0.5, -0.5, 0, 0, 1, 2
    expectAllClose(
      zScores([2, 4, 4, 4, 5, 5, 7, 9]),
      [-1.5, -0.5, -0.5, -0.5, 0, 0, 1, 2],
    );
  });

  it("normalizes two scores to -1 and 1", () => {
    // mean = (6 + 8) / 2 = 7
    // squared deviations: 1, 1 -> population variance = 2 / 2 = 1, SD = 1
    // z = (6 - 7) / 1 = -1, (8 - 7) / 1 = 1
    expectAllClose(zScores([6, 8]), [-1, 1]);
  });

  it("keeps input order and handles fractional weighted scores", () => {
    // mean = (7.8 + 5.2 + 6.5) / 3 = 19.5 / 3 = 6.5
    // deviations: 1.3, -1.3, 0 -> squared 1.69, 1.69, 0 -> sum 3.38
    // population variance = 3.38 / 3, SD = 1.3 * sqrt(2 / 3)
    // z = 1.3 / (1.3 * sqrt(2 / 3)) = sqrt(3 / 2) ~= 1.224744871391589
    // z = [sqrt(1.5), -sqrt(1.5), 0]
    expectAllClose(zScores([7.8, 5.2, 6.5]), [
      Math.sqrt(1.5),
      -Math.sqrt(1.5),
      0,
    ]);
  });
});

describe("zScores with zero spread", () => {
  it("returns all zeros when several integer scores are equal", () => {
    // max === min (5), so every z is 0 by the zero-spread rule.
    // (Naively: mean 5, every deviation 0, SD 0, and 0 / 0 is NaN.)
    expectAllClose(zScores([5, 5, 5]), [0, 0, 0]);
  });

  it("returns a single zero for a judge with exactly one submission", () => {
    // One score is trivially max === min, so its z is 0.
    // (Naively: mean = 6.5, deviation 0, SD 0, and 0 / 0 is NaN.)
    expectAllClose(zScores([6.5]), [0]);
  });

  it("returns all zeros when rounding leaves a tiny nonzero SD for equal scores", () => {
    // 7.15 is a realistic weighted score: weights 10/15/75 with scores 1/2/9
    // give (10*1 + 15*2 + 75*9) / 100 = 715 / 100 = 7.15 exactly in JS.
    // In floating point: 7.15 + 7.15 + 7.15 = 21.450000000000003,
    // so mean = 21.450000000000003 / 3 = 7.150000000000001 (not 7.15),
    // each deviation is about -8.9e-16, and SD is about 8.88e-16, not 0.
    // A guard of `sd === 0` misses this and gives z = -1 for every score.
    // The scores are still all equal (max === min), so every z must be 0.
    expectAllClose(zScores([7.15, 7.15, 7.15]), [0, 0, 0]);
  });
});

describe("teamScores", () => {
  it("averages each team's z-scores across judges and leaves out unsubmitted teams", () => {
    const assignments: Assignment[] = [
      { judgeId: "J1", teamId: "A", weightedScore: 6 },
      { judgeId: "J1", teamId: "B", weightedScore: 8 },
      { judgeId: "J2", teamId: "B", weightedScore: 4 },
      { judgeId: "J2", teamId: "C", weightedScore: 8 },
      { judgeId: "J3", teamId: "A", weightedScore: 7 },
      { judgeId: "J3", teamId: "D", weightedScore: null },
    ];

    // J1 submitted [6, 8]: mean 7, population SD 1 -> z A = -1, B = 1
    // J2 submitted [4, 8]: mean 6, population SD 2 -> z B = -1, C = 1
    // J3 submitted [7] only (D is null, not submitted): one submission -> z A = 0
    //   (if D's null were treated as 0, J3 would normalize [7, 0] and give
    //   z A = 1, which would make team A's score 0 instead of -0.5)
    // Team A: mean(-1, 0) = -0.5
    // Team B: mean(1, -1) = 0
    // Team C: mean(1) = 1
    // Team D: no submitted assignment -> unranked, absent from the result
    const result = teamScores(assignments);

    expect(Object.fromEntries(result)).toEqual({
      A: expect.closeTo(-0.5, 9),
      B: expect.closeTo(0, 9),
      C: expect.closeTo(1, 9),
    });
  });
});
