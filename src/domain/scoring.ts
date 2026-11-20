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
  void assignments;
  return new Map();
}
