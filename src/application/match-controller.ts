import {
  createDiagnostics,
  recordTransition,
  type MatchDiagnostics,
} from '../domain/galaxy-duel/diagnostics';
import type { MatchCommand, MatchSize, Player, GalaxyDuelMatch } from '../domain/galaxy-duel/model';
import { createMatch, transition } from '../domain/galaxy-duel/state-machine';
import { generateDotField } from '../generation/dot-field';
import { cryptoDie, cryptoSeed } from '../generation/random';
import { legalEndpoints } from '../geometry/legal-lines';
import { discardMatch, restoreMatch, saveMatch, type RestoreResult } from './persistence';

export type ControllerSnapshot = Readonly<{
  match?: GalaxyDuelMatch;
  diagnostics?: MatchDiagnostics;
  restoration: RestoreResult;
  lastMessage?: string;
}>;

export class MatchController {
  #snapshot: ControllerSnapshot;
  #listeners = new Set<(snapshot: ControllerSnapshot) => void>();

  constructor(private readonly storage: Storage = localStorage) {
    const restoration = restoreMatch(storage);
    this.#snapshot = { restoration };
  }

  subscribe(listener: (snapshot: ControllerSnapshot) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#snapshot);
    return () => this.#listeners.delete(listener);
  }

  get snapshot(): ControllerSnapshot {
    return this.#snapshot;
  }

  #publish(snapshot: ControllerSnapshot): void {
    this.#snapshot = snapshot;
    for (const listener of this.#listeners) listener(snapshot);
  }

  resume(): void {
    if (this.#snapshot.restoration.kind !== 'valid') return;
    const { match, diagnostics } = this.#snapshot.restoration.envelope;
    this.#publish({ restoration: { kind: 'none' }, match, diagnostics });
  }

  discardUnrecoverable(): void {
    discardMatch(this.storage);
    this.#publish({ restoration: { kind: 'none' } });
  }

  start(size: MatchSize, players: readonly [Player, Player]): void {
    const boardSeed = cryptoSeed();
    const startingPlayerIndex: 0 | 1 = cryptoSeed() % 2 === 0 ? 0 : 1;
    const match = createMatch({
      id: crypto.randomUUID(),
      boardSeed,
      size,
      dotField: generateDotField(size, boardSeed),
      players,
      startingPlayerIndex,
      createdAt: new Date().toISOString(),
    });
    const diagnostics = createDiagnostics(match);
    saveMatch(this.storage, match, diagnostics);
    this.#publish({ restoration: { kind: 'none' }, match, diagnostics });
  }

  roll(): void {
    this.dispatch({ type: 'ROLL_DIE', result: cryptoDie() });
  }

  eligibleEndpoints(from: string): string[] {
    const match = this.#snapshot.match;
    if (!match || match.phase.kind !== 'drawing-lines') return [];
    return legalEndpoints(match.dotField, match.lines, from);
  }

  dispatch(command: MatchCommand): void {
    const { match, diagnostics } = this.#snapshot;
    if (!match || !diagnostics) return;
    const outcome = transition(match, command);
    if (!outcome.accepted) {
      this.#publish({ ...this.#snapshot, lastMessage: outcome.reason });
      return;
    }
    const nextDiagnostics =
      command.type === 'START_REMATCH'
        ? createDiagnostics(outcome.match)
        : recordTransition(
            diagnostics,
            match,
            outcome.match,
            outcome.facts,
            outcome.feasibilityDurationMs,
          );
    if (outcome.match.phase.kind === 'result') discardMatch(this.storage);
    else saveMatch(this.storage, outcome.match, nextDiagnostics);
    this.#publish({
      restoration: { kind: 'none' },
      match: outcome.match,
      diagnostics: nextDiagnostics,
    });
  }

  rematch(): void {
    const match = this.#snapshot.match;
    if (!match || match.phase.kind !== 'result') return;
    const boardSeed = cryptoSeed();
    this.dispatch({
      type: 'START_REMATCH',
      boardSeed,
      dotField: generateDotField(match.size, boardSeed),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
  }

  newSetup(): void {
    discardMatch(this.storage);
    this.#publish({ restoration: { kind: 'none' } });
  }
}
