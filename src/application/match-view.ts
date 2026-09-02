import type { TriangleDuelMatch } from '../domain/triangle-duel/model';
import { resultLabel, scores, visibleStatus } from '../domain/triangle-duel/selectors';

export type MatchView = Readonly<{
  scores: readonly [number, number];
  status: string;
  resultLabel: string;
}>;

export function createMatchView(match: TriangleDuelMatch): MatchView {
  return {
    scores: scores(match),
    status: visibleStatus(match),
    resultLabel: resultLabel(match),
  };
}
