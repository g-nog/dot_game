import type { GalaxyDuelMatch } from '../domain/galaxy-duel/model';
import { resultLabel, scores, visibleStatus } from '../domain/galaxy-duel/selectors';

export type MatchView = Readonly<{
  scores: readonly [number, number];
  status: string;
  resultLabel: string;
}>;

export function createMatchView(match: GalaxyDuelMatch): MatchView {
  return {
    scores: scores(match),
    status: visibleStatus(match),
    resultLabel: resultLabel(match),
  };
}
