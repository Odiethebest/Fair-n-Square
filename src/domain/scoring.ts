export type CriterionScore = {
  /** Integer weight of the criterion; an event's weights sum to 100. */
  weight: number;
  /** Integer score the judge gave on the event's scale. */
  score: number;
};

export function weightedScore(scores: ReadonlyArray<CriterionScore>): number {
  return (
    scores.reduce((sum, { weight, score }) => sum + weight * score, 0) / 100
  );
}

export function zScores(weightedScores: ReadonlyArray<number>): number[] {
  if (Math.max(...weightedScores) === Math.min(...weightedScores)) {
    return weightedScores.map(() => 0);
  }
  const n = weightedScores.length;
  const mean = weightedScores.reduce((sum, x) => sum + x, 0) / n;
  const variance =
    weightedScores.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  return weightedScores.map((x) => (x - mean) / sd);
}

export type Assignment = {
  judgeId: string;
  teamId: string;
  /** The judge's weighted score for the team, or null if not submitted. */
  weightedScore: number | null;
};

export function teamScores(
  assignments: ReadonlyArray<Assignment>,
): Map<string, number> {
  const submittedByJudge = new Map<
    string,
    { teamId: string; weightedScore: number }[]
  >();
  for (const { judgeId, teamId, weightedScore } of assignments) {
    if (weightedScore === null) continue;
    const submitted = submittedByJudge.get(judgeId) ?? [];
    submitted.push({ teamId, weightedScore });
    submittedByJudge.set(judgeId, submitted);
  }

  const zByTeam = new Map<string, number[]>();
  for (const submitted of submittedByJudge.values()) {
    const zs = zScores(submitted.map((s) => s.weightedScore));
    submitted.forEach(({ teamId }, i) => {
      const teamZs = zByTeam.get(teamId) ?? [];
      teamZs.push(zs[i]);
      zByTeam.set(teamId, teamZs);
    });
  }

  const result = new Map<string, number>();
  for (const [teamId, teamZs] of zByTeam) {
    result.set(teamId, teamZs.reduce((sum, z) => sum + z, 0) / teamZs.length);
  }
  return result;
}
