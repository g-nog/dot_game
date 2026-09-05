import { tick } from 'svelte';
import DieControl from '../src/components/DieControl.svelte';
import { createMatch } from '../src/domain/galaxy-duel/state-machine';
import { triangleField } from './fixtures/dot-fields';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MatchSetup from '../src/components/MatchSetup.svelte';
import RulesView from '../src/components/RulesView.svelte';
import type { GalaxyDuelMatch } from '../src/domain/galaxy-duel/model';

describe('automatic end turn', () => {
  const match: GalaxyDuelMatch = {
    ...createMatch({
      id: 'countdown-test',
      boardSeed: 1,
      size: 'quick',
      dotField: triangleField,
      players: [
        { id: 'player-1', name: 'North', color: '#e76f51' },
        { id: 'player-2', name: 'South', color: '#2a9d8f' },
      ],
      startingPlayerIndex: 0,
      createdAt: '2026-09-05T12:00:00Z',
    }),
    phase: { kind: 'awaiting-end-turn', quota: 1, committed: 1, reason: 'quota-complete' },
  };

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows the countdown and ends exactly once after three seconds', async () => {
    vi.useFakeTimers();
    const onendturn = vi.fn();
    const { rerender } = render(DieControl, { match, status: '', onroll: vi.fn(), onendturn });
    await tick();
    const button = screen.getByRole('button', { name: 'End turn' });
    expect(button).toHaveTextContent('3s');
    await vi.advanceTimersByTimeAsync(1000);
    expect(button).toHaveTextContent('2s');
    // A fresh online snapshot of the same turn must not reset the timer.
    await rerender({ match: { ...match } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(button).toHaveTextContent('1s');
    await vi.advanceTimersByTimeAsync(999);
    expect(onendturn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onendturn).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(onendturn).toHaveBeenCalledTimes(1);
  });

  it('lets the player end early without a duplicate automatic action', async () => {
    vi.useFakeTimers();
    const onendturn = vi.fn();
    render(DieControl, { match, status: '', onroll: vi.fn(), onendturn });
    await tick();
    await vi.advanceTimersByTimeAsync(1000);
    await fireEvent.click(screen.getByRole('button', { name: 'End turn' }));
    expect(onendturn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(onendturn).toHaveBeenCalledTimes(1);
  });

  it('stops while disabled, restarts on resume, and cancels on unmount', async () => {
    vi.useFakeTimers();
    const onendturn = vi.fn();
    const { rerender, unmount } = render(DieControl, {
      match,
      status: '',
      onroll: vi.fn(),
      onendturn,
    });
    await tick();
    await vi.advanceTimersByTimeAsync(2000);
    await rerender({ disabled: true });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onendturn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'End turn' })).not.toHaveTextContent('1s');
    await rerender({ disabled: false });
    expect(screen.getByRole('button', { name: 'End turn' })).toHaveTextContent('3s');
    await vi.advanceTimersByTimeAsync(3000);
    expect(onendturn).toHaveBeenCalledTimes(1);
    await rerender({ match: { ...match, turn: match.turn + 1, activePlayerIndex: 1 } });
    expect(screen.getByRole('button', { name: 'End turn' })).toHaveTextContent('3s');
    unmount();
    await vi.advanceTimersByTimeAsync(3000);
    expect(onendturn).toHaveBeenCalledTimes(1);
  });
});

describe('setup and rules components', () => {
  it('validates distinct curated player colors', async () => {
    const onstart = vi.fn();
    render(MatchSetup, { onstart, onrules: vi.fn() });
    const selects = screen.getAllByRole('combobox');
    await fireEvent.change(selects[1], { target: { value: '#e76f51' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Start match' }));
    expect(screen.getByRole('alert')).toHaveTextContent('different color');
    expect(onstart).not.toHaveBeenCalled();
  });

  it('shows concise rules without relying on color alone', () => {
    render(RulesView, { onclose: vi.fn() });
    expect(screen.getByRole('dialog')).toHaveTextContent('exact line quota');
    expect(screen.getByRole('dialog')).toHaveTextContent('forfeited turn');
    expect(screen.getByRole('dialog')).toHaveTextContent('incomplete');
  });
});

describe('automatic dice', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rolls once, preserves a revealed quota, and rolls on the next turn', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const onroll = vi.fn();
    const match = createMatch({
      id: 'dice-test',
      boardSeed: 1,
      size: 'quick',
      dotField: triangleField,
      players: [
        { id: 'player-1', name: 'North', color: '#e76f51' },
        { id: 'player-2', name: 'South', color: '#2a9d8f' },
      ],
      startingPlayerIndex: 0,
      createdAt: '2026-09-05T12:00:00Z',
    });
    const { rerender, unmount } = render(DieControl, {
      match,
      status: 'Rolling…',
      onroll,
      onendturn: vi.fn(),
    });
    await tick();
    expect(screen.queryByRole('button', { name: 'Roll die' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dice rolling' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(420);
    expect(onroll).toHaveBeenCalledTimes(1);
    await rerender({
      match: { ...match, phase: { kind: 'drawing-lines', quota: 3, committed: 0 } },
    });
    expect(screen.getByRole('img', { name: 'Die result: 3' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onroll).toHaveBeenCalledTimes(1);
    await rerender({ match: { ...match, turn: 2, activePlayerIndex: 1 } });
    await vi.advanceTimersByTimeAsync(420);
    expect(onroll).toHaveBeenCalledTimes(2);
    await rerender({
      match: { ...match, phase: { kind: 'drawing-lines', quota: 2, committed: 0 } },
    });
    await rerender({ match: { ...match, turn: 3 } });
    unmount();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onroll).toHaveBeenCalledTimes(2);
  });
});
