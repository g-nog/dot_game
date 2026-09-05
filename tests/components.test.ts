import { tick } from 'svelte';
import DieControl from '../src/components/DieControl.svelte';
import { createMatch } from '../src/domain/triangle-duel/state-machine';
import { triangleField } from './fixtures/dot-fields';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MatchSetup from '../src/components/MatchSetup.svelte';
import RulesView from '../src/components/RulesView.svelte';

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
