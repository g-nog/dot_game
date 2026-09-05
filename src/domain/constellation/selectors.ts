import { enumerateLegalLines } from '../../geometry/legal-lines';
import { lineKey } from '../../geometry/model';
import { findMatches } from './matching';
import type { Match, Seat } from './model';
import { PATTERNS, SEQUENCES } from './patterns';
export const score = (match: Match, seat: Seat) =>
  match.completions.filter((c) => c.owner === seat).length;
export const reserved = (match: Match) => new Set(match.completions.flatMap((c) => c.edgeIds));
export const unfinished = (match: Match, seat: Seat) => {
  const ids = reserved(match);
  return match.edges.filter((e) => e.owner === seat && !ids.has(e.id));
};
export const target = (match: Match, seat: Seat) =>
  SEQUENCES[match.sequences[seat]][score(match, seat)];
export const candidates = (match: Match, seat: Seat) => {
  const id = target(match, seat);
  return id ? findMatches(PATTERNS[id], unfinished(match, seat)) : [];
};
export function availableActions(match: Match, seat: Seat) {
  const draws = enumerateLegalLines(match.map, match.edges);
  const relocations = unfinished(match, seat).flatMap((edge) =>
    enumerateLegalLines(
      match.map,
      match.edges.filter((e) => e.id !== edge.id),
    )
      .filter((pair) => lineKey(pair.a, pair.b) !== lineKey(edge.a, edge.b))
      .map((pair) => ({ id: edge.id, ...pair })),
  );
  return { draws, relocations };
}
export function canAct(match: Match, seat: Seat): boolean {
  if (enumerateLegalLines(match.map, match.edges).length) return true;
  return unfinished(match, seat).some((edge) =>
    enumerateLegalLines(
      match.map,
      match.edges.filter((e) => e.id !== edge.id),
    ).some((pair) => lineKey(pair.a, pair.b) !== lineKey(edge.a, edge.b)),
  );
}
