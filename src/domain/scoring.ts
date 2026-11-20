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
