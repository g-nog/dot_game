import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createMatch, rematch, transition } from '../src/domain/constellation/state-machine';
import { EXAMPLE_ROUTES } from '../src/maps/constellation';
import { score } from '../src/domain/constellation/selectors';
import type { Command, Match } from '../src/domain/constellation/model';
const players = [
  { name: 'Vega', color: '#79d9e8' },
  { name: 'Nova', color: '#ffbe83' },
] as const;
/** Reproducible exploratory policies; no claim of human or statistical balance evidence. */
it('records a four-matchup blocking and recovery cycle', () => {
  let opening = createMatch(players, 0, 'A');
  const traces = [];
  for (let cycle = 0; cycle < 4; cycle++) {
    let match: Match = opening;
    const events = [];
    const aRoute = [
      ['s1', 's2'],
      ['s2', 's3'],
      ['s3', 's9'],
      ['s9', 's8'],
      ...EXAMPLE_ROUTES.A.slice(3),
    ];
    const bRoute = [['s2', 's7'], ...EXAMPLE_ROUTES.B];
    while (match.phase.kind !== 'result') {
      const seat = match.active,
        sequence = match.sequences[seat],
        turn = match.turns[seat];
      const [a, b] = (sequence === 'A' ? aRoute : bRoute)[turn];
      const command: Command =
        sequence === 'A' && turn === 1
          ? { type: 'relocate', id: match.edges.find((e) => e.owner === seat)!.id, a, b }
          : { type: 'draw', a, b };
      const before = match;
      match = transition(match, command);
      expect(match, `${cycle} ${sequence} turn ${turn + 1}: ${a}-${b}`).not.toBe(before);
      if (match.phase.kind === 'selection') match = transition(match, { type: 'claim', index: 0 });
      events.push({
        sequence,
        turn: turn + 1,
        action: command.type,
        a,
        b,
        blockingOnly: sequence === 'B' && turn === 0,
        completions: score(match, seat),
      });
      if (match.phase.kind === 'handoff') match = transition(match, { type: 'end' });
    }
    expect(match.phase.kind).toBe('result');
    traces.push({
      cycle: cycle + 1,
      starter: opening.sequences[opening.starter],
      outcome: match.phase,
      turns: match.turns,
      events,
    });
    opening = rematch(match);
  }
  if (process.env.CONSTELLATION_TRACE_PATH)
    writeFileSync(process.env.CONSTELLATION_TRACE_PATH, JSON.stringify(traces, null, 2) + '\n');
});
