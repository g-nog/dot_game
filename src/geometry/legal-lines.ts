import type { Dot, DotField, DotId } from './model';
import { lineKey } from './model';
import { pointOnSegment, segmentsIntersectOrTouch } from './predicates';

export type CandidateLine = Readonly<{ a: DotId; b: DotId }>;

export function dotMap(field: DotField): ReadonlyMap<DotId, Dot> {
  return new Map(field.dots.map((dot) => [dot.id, dot]));
}

export function isLegalLine(
  field: DotField,
  committed: readonly CandidateLine[],
  candidate: CandidateLine,
): boolean {
  if (candidate.a === candidate.b) return false;
  const dots = dotMap(field);
  const a = dots.get(candidate.a);
  const b = dots.get(candidate.b);
  if (!a || !b) return false;
  const key = lineKey(candidate.a, candidate.b);
  if (committed.some((line) => lineKey(line.a, line.b) === key)) return false;
  if (field.dots.some((dot) => dot.id !== a.id && dot.id !== b.id && pointOnSegment(dot, a, b))) {
    return false;
  }

  for (const line of committed) {
    const c = dots.get(line.a);
    const d = dots.get(line.b);
    if (!c || !d) return false;
    const shared = [candidate.a, candidate.b].filter((id) => id === line.a || id === line.b);
    if (shared.length > 0) {
      const common = dots.get(shared[0]);
      const otherCandidate = candidate.a === shared[0] ? b : a;
      const otherCommitted = line.a === shared[0] ? d : c;
      if (common && pointOnSegment(otherCandidate, common, otherCommitted)) return false;
      if (common && pointOnSegment(otherCommitted, common, otherCandidate)) return false;
      continue;
    }
    if (segmentsIntersectOrTouch(a, b, c, d)) return false;
  }
  return true;
}

export function enumerateLegalLines(
  field: DotField,
  committed: readonly CandidateLine[],
): CandidateLine[] {
  const result: CandidateLine[] = [];
  const dots = [...field.dots].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const candidate = { a: dots[i].id, b: dots[j].id };
      if (isLegalLine(field, committed, candidate)) result.push(candidate);
    }
  }
  return result;
}

export function legalEndpoints(
  field: DotField,
  committed: readonly CandidateLine[],
  from: DotId,
): DotId[] {
  return field.dots
    .filter((dot) => dot.id !== from && isLegalLine(field, committed, { a: from, b: dot.id }))
    .map((dot) => dot.id)
    .sort();
}
