import type { CommittedLine, DotField } from '../domain/triangle-duel/model';
import { enumerateLegalLines, isLegalLine, type CandidateLine } from './legal-lines';

export function findCompatibleLineSequence(
  field: DotField,
  committed: readonly Pick<CommittedLine, 'a' | 'b'>[],
  required: number,
): CandidateLine[] | undefined {
  if (required === 0) return [];
  if (required < 0 || required > 6) return undefined;
  const candidates = enumerateLegalLines(field, committed);
  if (candidates.length < required) return undefined;

  function search(chosen: CandidateLine[], start: number): CandidateLine[] | undefined {
    if (chosen.length === required) return chosen;
    if (candidates.length - start < required - chosen.length) return undefined;
    const current = [...committed, ...chosen];
    for (let index = start; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (!isLegalLine(field, current, candidate)) continue;
      const witness = search([...chosen, candidate], index + 1);
      if (witness) return witness;
    }
    return undefined;
  }

  return search([], 0);
}

export function hasCompatibleLineSequence(
  field: DotField,
  committed: readonly Pick<CommittedLine, 'a' | 'b'>[],
  required: number,
): boolean {
  return findCompatibleLineSequence(field, committed, required) !== undefined;
}
