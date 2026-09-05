import { expect, test } from '@playwright/test';
import { createMatch, transition } from '../../src/domain/triangle-duel/state-machine';
import { generateDotField } from '../../src/generation/dot-field';
import { createDiagnostics, recordTransition } from '../../src/domain/triangle-duel/diagnostics';
import { STORAGE_KEY } from '../../src/application/persistence';

function almostTriangle() {
  const field = generateDotField('quick', 321);
  const base = createMatch({
    id: 'triangle-reveal',
    boardSeed: 321,
    size: 'quick',
    dotField: field,
    players: [
      { id: 'player-1', name: 'North', color: '#e76f51' },
      { id: 'player-2', name: 'South', color: '#2a9d8f' },
    ],
    startingPlayerIndex: 0,
    createdAt: '2026-09-05T12:00:00.000Z',
  });
  const roll = transition(base, { type: 'ROLL_DIE', result: 3 });
  if (!roll.accepted) throw new Error('Cannot start fixture');
  for (const a of field.dots)
    for (const b of field.dots)
      for (const c of field.dots) {
        if (a.id >= b.id || b.id >= c.id) continue;
        let match = roll.match;
        let diagnostics = recordTransition(
          createDiagnostics(base),
          base,
          match,
          roll.facts,
          roll.feasibilityDurationMs,
        );
        for (const [from, to] of [
          [a.id, b.id],
          [b.id, c.id],
          [c.id, a.id],
        ]) {
          const outcome = transition(match, { type: 'COMMIT_LINE', a: from, b: to });
          if (!outcome.accepted) break;
          if (outcome.match.claims.length)
            return {
              envelope: {
                schemaVersion: 1,
                savedAt: '2026-09-05T12:00:00.000Z',
                match,
                diagnostics,
              },
              from,
              to,
            };
          diagnostics = recordTransition(
            diagnostics,
            match,
            outcome.match,
            outcome.facts,
            outcome.feasibilityDurationMs,
          );
          match = outcome.match;
        }
      }
  throw new Error('No claimable triangle');
}

for (const reduced of [false, true]) {
  test(`triangle illustration appears on a new claim, not on resume (reduced motion: ${reduced})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const fixture = almostTriangle();
    await page.goto('/galaxy-duel/index.html');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: `galaxy:${STORAGE_KEY}`,
      value: JSON.stringify(fixture.envelope),
    });
    await page.reload();
    await page.getByRole('button', { name: 'Resume match' }).click();
    await expect(page.locator('.completion-illustration')).toHaveCount(0);
    await page.getByRole('button', { name: `Connect star ${fixture.from}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: `Connect star ${fixture.to}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    const illustration = page.locator('.completion-illustration');
    await expect(illustration).toHaveCount(1);
    await expect(page.locator('.score').first()).toContainText('1');
    await expect(illustration.locator('path').first()).toHaveCSS(
      'animation-name',
      reduced ? 'none' : /trace-illustration$/,
    );
    if (!reduced) {
      await page.waitForTimeout(800);
      await page.screenshot({ path: test.info().outputPath('triangle-illustration.png') });
      await expect(illustration).toHaveCSS('opacity', '0', { timeout: 5000 });
    }
    await page.reload();
    await page.getByRole('button', { name: 'Resume match' }).click();
    await expect(page.locator('.completion-illustration')).toHaveCount(0);
    await expect(page.locator('.score').first()).toContainText('1');
  });
}
