import { lineKey } from '../../geometry/model';
import type { Connection, MatchCandidate } from './model';
import type { Pattern } from './patterns';
/** Injective, non-induced graph embeddings, deduplicated by the reserved edge set. */
export function findMatches(pattern: Pattern, edges: readonly Connection[]): MatchCandidate[] {
  if (edges.length < pattern.edges.length) return [];
  const pairs = new Map(edges.map((e) => [lineKey(e.a, e.b), e.id]));
  const neighbors = new Map<string, Set<string>>();
  for (const e of edges) {
    for (const [a, b] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a)!.add(b);
    }
  }
  const adjacency = pattern.vertices.map((_, i) =>
    pattern.edges.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : [])),
  );
  // Highest degree first; prefer vertices attached to the growing embedding.
  const order: number[] = [];
  while (order.length < adjacency.length) {
    const remaining = adjacency.map((_, i) => i).filter((i) => !order.includes(i));
    remaining.sort(
      (a, b) =>
        Number(adjacency[b].some((v) => order.includes(v))) -
          Number(adjacency[a].some((v) => order.includes(v))) ||
        adjacency[b].length - adjacency[a].length ||
        a - b,
    );
    order.push(remaining[0]);
  }
  const vertices = [...neighbors.keys()].sort();
  const mapping: string[] = [];
  const used = new Set<string>();
  const results = new Map<string, MatchCandidate>();
  function visit(depth: number) {
    if (depth === order.length) {
      const edgeIds = pattern.edges
        .map(([a, b]) => pairs.get(lineKey(mapping[a], mapping[b]))!)
        .sort();
      const key = edgeIds.join(',');
      if (!results.has(key)) results.set(key, { edgeIds, vertices: [...mapping] });
      return;
    }
    const vertex = order[depth];
    const assigned = adjacency[vertex].filter((v) => mapping[v] !== undefined);
    const pool = assigned.length ? [...neighbors.get(mapping[assigned[0]])!].sort() : vertices;
    for (const star of pool) {
      if (used.has(star) || neighbors.get(star)!.size < adjacency[vertex].length) continue;
      if (!assigned.every((v) => pairs.has(lineKey(star, mapping[v])))) continue;
      mapping[vertex] = star;
      used.add(star);
      visit(depth + 1);
      used.delete(star);
      delete mapping[vertex];
    }
  }
  visit(0);
  return [...results.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, match]) => match);
}
