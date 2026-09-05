import { bench, describe } from 'vitest';
import { createMatch } from '../../src/domain/constellation/state-machine';
import { availableActions } from '../../src/domain/constellation/selectors';
import { findMatches } from '../../src/domain/constellation/matching';
import { PATTERNS } from '../../src/domain/constellation/patterns';
import { enumerateLegalLines } from '../../src/geometry/legal-lines';
import type { Connection } from '../../src/domain/constellation/model';
const initial = createMatch(
  [
    { name: 'One', color: '#79d9e8' },
    { name: 'Two', color: '#ffbe83' },
  ],
  0,
  'A',
);
const edges: Connection[] = [];
for (let i = 0; i < 52; i++) {
  const legal = enumerateLegalLines(initial.map, edges);
  if (!legal.length) break;
  edges.push({ ...legal[(i * 37) % legal.length], id: `crowded-${i}`, owner: i % 2 === 0 ? 0 : 1 });
}
const crowded = { ...initial, edges };
describe(`Meridian crowded legal fixture (${edges.length} connections)`, () => {
  bench(
    'all six patterns, owned edges',
    () => {
      for (const pattern of Object.values(PATTERNS))
        findMatches(
          pattern,
          edges.filter((e) => e.owner === 0),
        );
    },
    { iterations: 100 },
  );
  bench(
    'all draw and genuine relocation candidates, both players',
    () => {
      availableActions(crowded, 0);
      availableActions(crowded, 1);
    },
    { iterations: 100 },
  );
});
