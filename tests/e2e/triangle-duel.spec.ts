import { expect, test, type Page } from '@playwright/test';
import { createDiagnostics, recordTransition } from '../../src/domain/triangle-duel/diagnostics';
import type { ClaimedTriangle, CommittedLine, Player } from '../../src/domain/triangle-duel/model';
import { createMatch, transition } from '../../src/domain/triangle-duel/state-machine';
import { STORAGE_KEY } from '../../src/application/persistence';
import { enumerateLegalLines } from '../../src/geometry/legal-lines';
import { claimsCompletedByLine } from '../../src/geometry/scoring-triangles';
import { generateDotField } from '../../src/generation/dot-field';

async function dragFirstLegalLine(page: Page) {
  const source = page.locator('.touch-target').first();
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error('No source dot');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  const target = page.locator('.touch-target.eligible').first();
  await expect(target).toBeAttached();
  const targetBox = await target.boundingBox();
  if (!targetBox) throw new Error('No eligible target');
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.up();
}

function initialEnvelope() {
  const dotField = generateDotField('quick', 321);
  const players: readonly [Player, Player] = [
    { id: 'player-1', name: 'North', color: '#e76f51' },
    { id: 'player-2', name: 'South', color: '#2a9d8f' },
  ];
  const match = createMatch({
    id: 'saved',
    boardSeed: 321,
    size: 'quick',
    dotField,
    players,
    startingPlayerIndex: 0,
    createdAt: '2026-08-31T12:00:00.000Z',
  });
  return JSON.stringify({
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    match,
    diagnostics: createDiagnostics(match),
  });
}

function revealedQuotaEnvelope(quota: number) {
  const dotField = generateDotField('quick', 654);
  const players: readonly [Player, Player] = [
    { id: 'player-1', name: 'North', color: '#e76f51' },
    { id: 'player-2', name: 'South', color: '#2a9d8f' },
  ];
  const initial = createMatch({
    id: 'revealed-quota',
    boardSeed: 654,
    size: 'quick',
    dotField,
    players,
    startingPlayerIndex: 0,
    createdAt: '2026-08-31T12:00:00.000Z',
  });
  const outcome = transition(initial, { type: 'ROLL_DIE', result: quota });
  if (!outcome.accepted) throw new Error(outcome.reason);
  const diagnostics = recordTransition(
    createDiagnostics(initial),
    initial,
    outcome.match,
    outcome.facts,
    outcome.feasibilityDurationMs,
  );
  return JSON.stringify({
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    match: outcome.match,
    diagnostics,
  });
}

test('setup, rules, pointer cancel, and drag commit work in portrait', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Triangle Duel' })).toBeVisible();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toContainText('exact line quota');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.getByRole('button', { name: 'Rules' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll die' })).toHaveCount(0);

  const source = page.locator('.touch-target').first();
  const sourceBox = await source.boundingBox();
  if (!sourceBox) throw new Error('No source dot');
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(page.locator('line.committed')).toHaveCount(0);

  await dragFirstLegalLine(page);
  await expect(page.locator('line.committed')).toHaveCount(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('reload preserves every quota-three persistence boundary', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: revealedQuotaEnvelope(3) },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume match' }).click();
  await expect(page.locator('.turn-control')).toContainText('0 of 3 lines');

  await page.reload();
  await page.getByRole('button', { name: 'Resume match' }).click();
  await expect(page.locator('.turn-control')).toContainText('0 of 3 lines');
  await expect(page.getByRole('button', { name: 'Roll die' })).toHaveCount(0);

  for (let committed = 1; committed <= 3; committed += 1) {
    await dragFirstLegalLine(page);
    await expect(page.locator('line.committed')).toHaveCount(committed);
    await page.reload();
    await page.getByRole('button', { name: 'Resume match' }).click();
    await expect(page.locator('line.committed')).toHaveCount(committed);
  }

  await expect(page.getByRole('button', { name: 'End turn' })).toBeVisible();
  await page.getByRole('button', { name: 'End turn' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Resume match' }).click();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await expect(page.locator('.score.active')).toContainText('South');
});

test('starting new setup confirms replacement of the one resumable match', async ({ page }) => {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: initialEnvelope(),
  });
  await page.goto('/');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'New setup' }).click();
  await expect(page.getByRole('heading', { name: 'Triangle Duel' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('reduced-motion preference removes motion durations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--motion-fast').trim(),
    ),
  ).toBe('0ms');
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  expect(await page.locator('.die').evaluate((die) => getComputedStyle(die).animationName)).toBe(
    'none',
  );
});

test('corrupt storage is explained and can be discarded', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{bad'), STORAGE_KEY);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'This match can’t be resumed' })).toBeVisible();
  await page.getByRole('button', { name: 'Discard saved match' }).click();
  await expect(page.getByRole('heading', { name: 'Triangle Duel' })).toBeVisible();
});

test('a restored final line resolves the result and rematch alternates the starter', async ({
  page,
}) => {
  const field = generateDotField('quick', 98765);
  const players: readonly [Player, Player] = [
    { id: 'player-1', name: 'North', color: '#e76f51' },
    { id: 'player-2', name: 'South', color: '#2a9d8f' },
  ];
  const lines: CommittedLine[] = [];
  const claims: ClaimedTriangle[] = [];
  while (true) {
    const candidate = enumerateLegalLines(field, lines)[0];
    if (!candidate) break;
    const line: CommittedLine = { ...candidate, playerId: 'player-1', turn: 1 };
    lines.push(line);
    claims.push(...claimsCompletedByLine(field, lines, line, claims, 'player-1', 1));
  }
  const finalLine = lines.pop();
  if (!finalLine) throw new Error('Expected a final line');
  claims.splice(0, claims.length);
  for (const line of lines)
    claims.push(
      ...claimsCompletedByLine(
        field,
        lines.slice(0, lines.indexOf(line) + 1),
        line,
        claims,
        line.playerId,
        line.turn,
      ),
    );
  const base = createMatch({
    id: 'almost-done',
    boardSeed: 98765,
    size: 'quick',
    dotField: field,
    players,
    startingPlayerIndex: 0,
    createdAt: '2026-08-31T12:00:00.000Z',
  });
  const match = {
    ...base,
    lines,
    claims,
    turn: 2,
    activePlayerIndex: 1 as const,
    phase: { kind: 'drawing-lines' as const, quota: 1, committed: 0 },
  };
  const diagnostics = {
    ...createDiagnostics(match),
    committedLineCount: lines.length,
    claimedTriangleCount: claims.length,
    turnCount: 2,
  };
  const envelope = JSON.stringify({
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    match,
    diagnostics,
  });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: envelope,
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume match' }).click();
  const from = page.getByRole('button', { name: `Start line at ${finalLine.a}` });
  const to = page.getByRole('button', { name: `Start line at ${finalLine.b}` });
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error('Final line endpoints unavailable');
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2);
  await page.mouse.up();
  await expect(page.getByText('Board exhausted')).toBeVisible();
  await page.getByRole('button', { name: 'Rematch' }).click();
  await expect(page.getByText('South', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await expect(page.locator('.score.active')).toContainText('South');
  await expect(page.locator('line.committed')).toHaveCount(0);
});
