import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
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
