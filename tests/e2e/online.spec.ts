import { test, expect, type Page } from '@playwright/test';
import type { ServerMessage, RoomView } from '../../src/online/protocol';

type InstrumentedWindow = Window & {
  roomSocket: WebSocket;
  roomView?: RoomView;
  roomSeat?: number;
  roomError?: string;
};
async function observe(page: Page) {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        const state = window as unknown as InstrumentedWindow;
        if (!String(url).includes('/api/rooms/')) return;
        state.roomSocket = this;
        this.addEventListener('message', (event) => {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === 'snapshot') {
            state.roomView = message.room;
            state.roomSeat = message.seat;
          }
          if (message.type === 'error') state.roomError = message.message;
        });
      }
    };
  });
}
async function room(page: Page) {
  return page.evaluate(() => (window as unknown as InstrumentedWindow).roomView!);
}

test('friends join, share authoritative play, reconnect, and leave', async ({ page, browser }) => {
  await observe(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play online' }).click();
  await page.getByLabel('Your name').fill('North');
  await page.getByLabel('Match size').selectOption('quick');
  await page.getByRole('button', { name: 'Create invite link' }).click();
  const invite = page.getByLabel('Invite link');
  await expect(invite).toBeVisible();
  const link = await invite.inputValue();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await observe(guest);
  await guest.goto(link);
  await guest.getByLabel('Your name').fill('South');
  await guest.getByRole('button', { name: 'Join room' }).click();
  await expect(guest.getByRole('application')).toBeVisible();
  await expect(page.getByRole('application')).toBeVisible();
  // The online wrapper must let the board use the whole viewport, including
  // after rotating a tablet. Previously it shrank to the width of the HUD.
  const originalViewport = page.viewportSize()!;
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    originalViewport,
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => (await page.locator('.galaxy-field').boundingBox())!.width)
      .toBeGreaterThanOrEqual(viewport.width - 48);
    const controls = await page.locator('.turn-control').boundingBox();
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  }
  await expect.poll(async () => (await room(page)).match?.phase.kind).not.toBe('awaiting-roll');
  await expect.poll(async () => (await room(guest)).version).toBe((await room(page)).version);
  const initial = await room(page);
  expect((await room(guest)).match).toEqual(initial.match);
  const active = initial.match!.activePlayerIndex === 0 ? page : guest;
  const inactive = active === page ? guest : page;
  await expect(
    inactive.locator('.player-label').getByText('Playing', { exact: true }),
  ).toBeVisible();
  const controls = await page.locator('.turn-control').boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(inactive.locator('.touch-target').first()).toHaveAttribute('aria-disabled', 'true');

  // Bypass the interface: the server must reject an out-of-turn command.
  await inactive.evaluate(() => {
    const state = window as unknown as InstrumentedWindow;
    state.roomSocket.send(
      JSON.stringify({
        type: 'action',
        id: 'wrong-turn',
        version: state.roomView!.version,
        action: { type: 'END_TURN' },
      }),
    );
  });
  await expect
    .poll(() => inactive.evaluate(() => (window as unknown as InstrumentedWindow).roomError))
    .toContain('your turn');
  expect((await room(page)).version).toBe(initial.version);

  const firstStar = active.locator('.touch-target').first();
  await firstStar.focus();
  await active.keyboard.press('Enter');
  const target = active.locator('.touch-target.eligible').first();
  await target.focus();
  await active.keyboard.press('Enter');
  await expect.poll(async () => (await room(page)).match!.lines.length).toBe(1);
  await expect.poll(async () => (await room(guest)).match!.lines.length).toBe(1);
  const saved = (await room(page)).match;

  // A third browser cannot take either reserved seat.
  const thirdContext = await browser.newContext();
  const third = await thirdContext.newPage();
  await third.goto(link);
  await third.getByRole('button', { name: 'Join room' }).click();
  await expect(third.getByRole('alert')).toContainText('two players');
  await thirdContext.close();

  // Stop the guest connection, then refresh to reclaim the saved seat.
  await guest.evaluate(() =>
    (window as unknown as InstrumentedWindow).roomSocket.close(4001, 'Test disconnect'),
  );
  await expect(page.getByText('Play paused', { exact: true })).toBeVisible();
  await expect(page.locator('.touch-target').first()).toHaveAttribute('aria-disabled', 'true');
  await guest.reload();
  await expect(guest.getByRole('application')).toBeVisible();
  await expect(page.getByText('Play paused', { exact: true })).toHaveCount(0);
  expect((await room(guest)).match).toEqual(saved);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Leave room', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The duel has ended' })).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'The duel has ended' })).toBeVisible();
  await guestContext.close();
});

test('invalid invites give a recoverable error', async ({ page }) => {
  await page.goto('/?room=00000000-0000-4000-8000-000000000000');
  await page.getByRole('button', { name: 'Join room' }).click();
  await expect(page.getByRole('alert')).toContainText('Room not found or expired');
  await page.getByRole('button', { name: 'Back to setup' }).click();
  await expect(page.getByRole('button', { name: 'Start match', exact: true })).toBeVisible();
});

test('a silent connection times out and can reclaim its seat', async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'The server heartbeat is browser-independent.',
  );
  test.setTimeout(75_000);
  await observe(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play online' }).click();
  await page.getByRole('button', { name: 'Create invite link' }).click();
  const invite = page.getByLabel('Invite link');
  await expect(invite).toBeVisible();
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await observe(guest);
  await guest.goto(await invite.inputValue());
  await guest.getByRole('button', { name: 'Join room' }).click();
  await expect(guest.getByRole('application')).toBeVisible();
  await expect.poll(async () => (await room(page)).match?.phase.kind).not.toBe('awaiting-roll');
  const matchId = (await room(page)).match!.id;
  // Keep the TCP connection open but stop all guest heartbeats, as with a suspended device.
  await guest.evaluate(() => {
    (window as unknown as InstrumentedWindow).roomSocket.send = () => {};
  });
  await expect(page.getByText('Play paused', { exact: true })).toBeVisible({ timeout: 55_000 });
  await expect(page.getByText('Play paused', { exact: true })).toHaveCount(0, { timeout: 10_000 });
  expect((await room(guest)).match!.id).toBe(matchId);
  await guestContext.close();
});
