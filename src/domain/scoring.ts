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

function mean(values: ReadonlyArray<number>): number {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

export function zScores(weightedScores: ReadonlyArray<number>): number[] {
  if (Math.max(...weightedScores) === Math.min(...weightedScores)) {
    return weightedScores.map(() => 0);
  }
  const judgeMean = mean(weightedScores);
  const variance = mean(weightedScores.map((x) => (x - judgeMean) ** 2));
  const sd = Math.sqrt(variance);
  return weightedScores.map((x) => (x - judgeMean) / sd);
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
    result.set(teamId, mean(teamZs));
  }
  return result;
}

export type TeamResult = {
  teamId: string;
  score: number;
  meanWeightedScore: number;
};

export function rankTeams(
  teams: ReadonlyArray<TeamResult>,
): Array<{ teamId: string; rank: number }> {
  void teams;
  return [];
}
