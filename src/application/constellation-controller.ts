import type { Command, Match, Player } from '../domain/constellation/model';
import { createMatch, rematch, transition } from '../domain/constellation/state-machine';
/** Deliberately memory-only. A page reload creates a new controller and setup. */
export class ConstellationController {
  match: Match | null = null;
  start(players: readonly [Player, Player]) {
    this.match = createMatch(players, Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 'A' : 'B');
    return this.match;
  }
  dispatch(command: Command) {
    if (this.match) this.match = transition(this.match, command);
    return this.match;
  }
  rematch() {
    if (this.match?.phase.kind === 'result') this.match = rematch(this.match);
    return this.match;
  }
  reset() {
    this.match = null;
  }
}
