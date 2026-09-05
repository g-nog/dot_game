import type {
  ClaimedTriangle,
  CommittedLine,
  DotField,
  PlayerId,
} from '../domain/galaxy-duel/model';
import { lineKey, triangleKey } from '../domain/galaxy-duel/model';
import { dotMap } from './legal-lines';
import { orientation, pointStrictlyInTriangle } from './predicates';

export function claimsCompletedByLine(
  field: DotField,
  lines: readonly CommittedLine[],
  finalLine: CommittedLine,
  existingClaims: readonly ClaimedTriangle[],
  playerId: PlayerId,
  turn: number,
): ClaimedTriangle[] {
  const points = dotMap(field);
  const connected = new Map<string, Set<string>>();
  for (const line of lines) {
    if (!connected.has(line.a)) connected.set(line.a, new Set());
    if (!connected.has(line.b)) connected.set(line.b, new Set());
    connected.get(line.a)?.add(line.b);
    connected.get(line.b)?.add(line.a);
  }
  const neighborsA = connected.get(finalLine.a) ?? new Set<string>();
  const neighborsB = connected.get(finalLine.b) ?? new Set<string>();
  const claimed = new Set(existingClaims.map((claim) => claim.key));
  const directLines = new Set(lines.map((line) => lineKey(line.a, line.b)));
  const result: ClaimedTriangle[] = [];

  for (const thirdId of [...neighborsA].filter((id) => neighborsB.has(id)).sort()) {
    if (!directLines.has(lineKey(finalLine.a, thirdId))) continue;
    if (!directLines.has(lineKey(finalLine.b, thirdId))) continue;
    const a = points.get(finalLine.a);
    const b = points.get(finalLine.b);
    const c = points.get(thirdId);
    if (!a || !b || !c || orientation(a, b, c) === 0) continue;
    if (
      field.dots.some(
        (dot) => ![a.id, b.id, c.id].includes(dot.id) && pointStrictlyInTriangle(dot, a, b, c),
      )
    ) {
      continue;
    }
    const key = triangleKey([a.id, b.id, c.id]);
    if (claimed.has(key)) continue;
    claimed.add(key);
    result.push({
      key,
      dots: [a.id, b.id, c.id].sort() as [string, string, string],
      playerId,
      turn,
    });
  }
  return result;
}
