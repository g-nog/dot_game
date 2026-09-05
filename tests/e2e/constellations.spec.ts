import { expect, test, type Page } from '@playwright/test';
import { EXAMPLE_ROUTES } from '../../src/maps/constellation';

async function start(page: Page) {
  await page.goto('/constellations/index.html');
  await page.getByRole('button', { name: 'Open the star map' }).click();
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'action');
}
async function connect(page: Page, a: string, b: string) {
  // Keyboard input uses the same selection and domain command as pointer input.
  await page.locator(`[data-star="${a}"]`).press('Enter');
  await page.locator(`[data-star="${b}"]`).press('Enter');
}
async function end(page: Page) {
  await page.getByRole('button', { name: /End turn/ }).click();
}
async function active(page: Page) {
  return Number(await page.locator('.match-shell').getAttribute('data-active'));
}
async function sequences(page: Page) {
  return Promise.all(
    [0, 1].map((i) => page.locator(`[data-seat="${i}"]`).getAttribute('data-sequence')),
  ) as Promise<('A' | 'B')[]>;
}

test('gallery and independent pages preserve Triangle Duel storage; constellation reload starts fresh', async ({
  page,
}) => {
  await page.goto('/triangle-duel/index.html');
  await expect(page.getByRole('heading', { name: 'Triangle Duel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start match', exact: true }).click();
  const before = await page.evaluate(() => localStorage.getItem('triangle-duel:resumable-match'));
  expect(before).not.toBeNull();
  await page.getByRole('link', { name: 'Game menu' }).click();
  await expect(page.getByRole('heading', { name: 'A little friendly rivalry.' })).toBeVisible();
  await page.locator('.constellations .play').click();
  await expect(page.getByRole('heading', { name: 'Constellations.' })).toBeVisible();
  await page.getByRole('button', { name: 'Open the star map' }).click();
  await connect(page, 's1', 's2');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open the star map' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('triangle-duel:resumable-match'))).toBe(
    before,
  );
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    'triangle-duel:resumable-match',
  ]);
  await page.getByRole('link', { name: 'DOT GAMES' }).click();
  await page.locator('.triangle-duel .play').click();
  await expect(page.getByRole('heading', { name: 'Continue the duel?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Continue the duel?' })).toBeVisible();
});

test('complete matches and all four rematch assignments through the interface', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page);
  const openingSequences = await sequences(page),
    openingStarter = await active(page);
  for (let cycle = 0; cycle < 4; cycle++) {
    const seq = await sequences(page);
    expect(seq[0]).toBe(
      cycle === 1 || cycle === 2 ? (openingSequences[0] === 'A' ? 'B' : 'A') : openingSequences[0],
    );
    expect(await active(page)).toBe(cycle % 2 ? 1 - openingStarter : openingStarter);
    const indices = [0, 0];
    for (let turn = 0; turn < 23; turn++) {
      const seat = await active(page);
      const [a, b] = EXAMPLE_ROUTES[seq[seat]][indices[seat]++];
      await connect(page, a, b);
      if (turn < 22) await end(page);
    }
    await expect(page.getByRole('region', { name: 'Match result' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /wins the sky/ })).toBeVisible();
    await expect(page.locator('.completion-illustration')).toHaveCount(5);
    if (cycle < 3) await page.getByRole('button', { name: /Rematch ·/ }).click();
  }
  expect(errors).toEqual([]);
});

test('ambiguous completion previews each edge set and reserves the selected choice', async ({
  page,
}) => {
  await start(page);
  const seq = await sequences(page);
  const aRoutes = [
    ['s1', 's2'],
    ['s1', 's7'],
    ['s8', 's14'],
    ['s1', 's8'],
  ];
  const indices = [0, 0];
  for (let i = 0; i < 8; i++) {
    const seat = await active(page),
      sequence = seq[seat];
    const [a, b] = (sequence === 'A' ? aRoutes : EXAMPLE_ROUTES.B)[indices[seat]++];
    await connect(page, a, b);
    if ((await page.locator('.match-shell').getAttribute('data-phase')) === 'selection') break;
    await end(page);
  }
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'selection');
  await expect(page.getByText('Option 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next constellation' }).click();
  await expect(page.getByText('Option 2 of 2')).toBeVisible();
  await expect(page.getByRole('button', { name: /End turn/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Claim this constellation' }).click();
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'handoff');
  await expect(page.getByRole('status')).toContainText('Constellation completed');
});

test('relocation cancellation, both endpoints movable, and 20-turn draw', async ({ page }) => {
  test.setTimeout(180000);
  await start(page);
  const pairs = [
    [
      ['s1', 's2'],
      ['s7', 's8'],
    ],
    [
      ['s5', 's6'],
      ['s11', 's12'],
    ],
  ];
  const turns = [0, 0];
  for (let turn = 0; turn < 40; turn++) {
    const seat = await active(page);
    const count = turns[seat]++;
    if (count === 0) await connect(page, ...(pairs[seat][0] as [string, string]));
    else {
      await page.getByRole('button', { name: 'Relocate', exact: true }).click();
      await page.getByRole('button', { name: /^Move / }).click();
      if (count === 1) {
        await page.getByRole('button', { name: 'Cancel relocation' }).click();
        await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'action');
        await page.getByRole('button', { name: 'Relocate', exact: true }).click();
        await page.getByRole('button', { name: /^Move / }).click();
      }
      await connect(page, ...(pairs[seat][count % 2] as [string, string]));
    }
    if (turn < 39) await end(page);
  }
  await expect(page.getByRole('heading', { name: 'A sky shared equally.' })).toBeVisible();
  await expect(page.getByText('20 TURNS EACH', { exact: true })).toBeVisible();
});

test('pointer draw, invalid drag, reduced motion and minimum viewport', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await page.locator('[data-star="s1"]').scrollIntoViewIfNeeded();
  const map = page.locator('.star-map');
  const box = await map.boundingBox();
  if (!box) throw new Error('Map missing');
  const point = (x: number, y: number) => ({
    x: box.x + (x / 720) * box.width,
    y: box.y + (y / 720) * box.height,
  });
  const a = point(56, 66),
    b = point(174, 49);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'action');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'handoff');
  if (isMobile) {
    await end(page);
    await page.locator('[data-star="s5"]').scrollIntoViewIfNeeded();
    const current = await page.locator('.star-map svg').boundingBox();
    if (!current) throw new Error('Map missing');
    await page.touchscreen.tap(
      current.x + (547 / 720) * current.width,
      current.y + (78 / 720) * current.height,
    );
    await page.touchscreen.tap(
      current.x + (667 / 720) * current.width,
      current.y + (51 / 720) * current.height,
    );
    await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'handoff');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('region', { name: 'Constellation rules' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('the board remains playable when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.startsWith('webgl')) return null;
      return Reflect.apply(original, this, [kind, ...args]);
    } as typeof original;
  });
  await start(page);
  await connect(page, 's1', 's2');
  await expect(page.locator('.match-shell')).toHaveAttribute('data-phase', 'handoff');
  await expect(page.locator('.star-map')).toHaveAttribute('data-renderer', 'svg');
  await expect(page.locator('.star-map .playable-star')).toHaveCount(24);
});
