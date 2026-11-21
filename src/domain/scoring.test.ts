import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type Assignment,
  rankTeams,
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

describe("teamScores invariance (AC5)", () => {
  // With weights summing to 100 and integer scores 1-10, sum(weight x score) is
  // an integer in [100, 1000], so a weighted score is that integer / 100.
  const weightedScoreArb = fc
    .integer({ min: 100, max: 1000 })
    .map((n) => n / 100);

  // A few judges, each assigned to every team; each assignment is either
  // submitted (a weighted score) or not submitted (null). At least one is
  // submitted.
  const assignmentsArb = fc
    .record({
      judges: fc.integer({ min: 1, max: 4 }),
      teams: fc.integer({ min: 1, max: 5 }),
    })
    .chain(({ judges, teams }) =>
      fc
        .array(fc.option(weightedScoreArb, { nil: null }), {
          minLength: judges * teams,
          maxLength: judges * teams,
        })
        .map((scores) =>
          scores.map((weightedScore, i): Assignment => ({
            judgeId: `J${Math.floor(i / teams)}`,
            teamId: `T${i % teams}`,
            weightedScore,
          })),
        ),
    )
    .filter((assignments) => assignments.some((a) => a.weightedScore !== null));

  // Picks one judge who has at least one submission.
  function pickJudge(
    assignments: ReadonlyArray<Assignment>,
    index: number,
  ): string {
    const judgeIds = [
      ...new Set(
        assignments
          .filter((a) => a.weightedScore !== null)
          .map((a) => a.judgeId),
      ),
    ];
    return judgeIds[index % judgeIds.length];
  }

  function transformJudge(
    assignments: ReadonlyArray<Assignment>,
    judgeId: string,
    f: (score: number) => number,
  ): Assignment[] {
    return assignments.map((a) =>
      a.judgeId === judgeId && a.weightedScore !== null
        ? { ...a, weightedScore: f(a.weightedScore) }
        : a,
    );
  }

  function expectSameTeamScores(
    before: Map<string, number>,
    after: Map<string, number>,
  ) {
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [teamId, score] of before) {
      expect(Math.abs((after.get(teamId) ?? NaN) - score)).toBeLessThanOrEqual(
        1e-9,
      );
    }
  }

  it("leaves every team score unchanged when one judge's scores shift by b in [-100, 100]", () => {
    fc.assert(
      fc.property(
        assignmentsArb,
        fc.nat(),
        fc.double({ min: -100, max: 100, noNaN: true }),
        (assignments, judgeIndex, b) => {
          const judgeId = pickJudge(assignments, judgeIndex);
          const shifted = transformJudge(assignments, judgeId, (x) => x + b);
          expectSameTeamScores(teamScores(assignments), teamScores(shifted));
        },
      ),
    );
  });

  it("leaves every team score unchanged when one judge's scores scale by a in [0.1, 10]", () => {
    fc.assert(
      fc.property(
        assignmentsArb,
        fc.nat(),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (assignments, judgeIndex, a) => {
          const judgeId = pickJudge(assignments, judgeIndex);
          const scaled = transformJudge(assignments, judgeId, (x) => x * a);
          expectSameTeamScores(teamScores(assignments), teamScores(scaled));
        },
      ),
    );
  });
});

describe("rankTeams", () => {
  it("orders distinct scores descending with ranks 1, 2, 3", () => {
    // Scores 1 > 0.5 > -1, so A is first, B second, C third.
    // meanWeightedScore never matters here because no scores tie.
    const result = rankTeams([
      { teamId: "C", score: -1, meanWeightedScore: 9 },
      { teamId: "A", score: 1, meanWeightedScore: 5 },
      { teamId: "B", score: 0.5, meanWeightedScore: 7 },
    ]);

    expect(result).toEqual([
      { teamId: "A", rank: 1 },
      { teamId: "B", rank: 2 },
      { teamId: "C", rank: 3 },
    ]);
  });

  it("breaks a score tie by the higher mean weighted score", () => {
    // A and B both score 0.5. B's mean weighted score 8 > A's 7, so B wins.
    // They are not fully tied, so they get different ranks.
    const result = rankTeams([
      { teamId: "A", score: 0.5, meanWeightedScore: 7 },
      { teamId: "B", score: 0.5, meanWeightedScore: 8 },
    ]);

    expect(result).toEqual([
      { teamId: "B", rank: 1 },
      { teamId: "A", rank: 2 },
    ]);
  });

  it("gives fully tied teams the same rank and skips the next rank", () => {
    // A and B match on score (1) and mean weighted score (7): they share
    // rank 1 and are listed by teamId ascending (A, then B).
    // C scores 0 < 1, so it comes after them. Two teams rank above it,
    // so its rank is 3, not 2 (competition ranking: 1, 1, 3).
    // C's higher mean weighted score (9) does not matter: score decides first.
    const result = rankTeams([
      { teamId: "C", score: 0, meanWeightedScore: 9 },
      { teamId: "B", score: 1, meanWeightedScore: 7 },
      { teamId: "A", score: 1, meanWeightedScore: 7 },
    ]);

    expect(result).toEqual([
      { teamId: "A", rank: 1 },
      { teamId: "B", rank: 1 },
      { teamId: "C", rank: 3 },
    ]);
  });

  it("treats scores within 1e-9 as equal, so the tie-break decides", () => {
    // B's score is 0.5 + 5e-10. The difference 5e-10 is within 1e-9, so the
    // scores count as equal. The tie-break then compares mean weighted scores:
    // A's 8 > B's 7, so A ranks first.
    // A plain `>` comparison on score would put B first instead.
    const result = rankTeams([
      { teamId: "A", score: 0.5, meanWeightedScore: 8 },
      { teamId: "B", score: 0.5 + 5e-10, meanWeightedScore: 7 },
    ]);

    expect(result).toEqual([
      { teamId: "A", rank: 1 },
      { teamId: "B", rank: 2 },
    ]);
  });

  it("returns an empty ranking for no teams", () => {
    // No teams to rank, so the result is empty.
    expect(rankTeams([])).toEqual([]);
  });
});
