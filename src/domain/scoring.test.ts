import { describe, expect, it } from "vitest";
import { weightedScore, zScores } from "@/domain/scoring";

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
