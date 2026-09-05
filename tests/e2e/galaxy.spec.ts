import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../../src/application/persistence';

test('home opens Galaxy Duel, supports tap and keyboard, and preserves legacy storage', async ({
  page,
}) => {
  const original = 'legacy save';
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: original,
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Galaxy Duel' })).toBeVisible();
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.galaxy-field canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await page.locator('.touch-target').first().click();
  await page.locator('.touch-target.eligible').first().click();
  await expect(page.locator('line.committed')).toHaveCount(1);
  const end = page.getByRole('button', { name: 'End turn' });
  if (await end.isVisible()) await end.click();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await page.locator('.touch-target').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('.touch-target.eligible').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('line.committed')).toHaveCount(2);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  const box = await page.locator('.galaxy-field').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('no WebGL still gives a playable star board', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.galaxy-field')).not.toHaveClass(/webgl-ready/);
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await page.locator('.touch-target').first().click();
  await page.locator('.touch-target.eligible').first().click();
  await expect(page.locator('line.committed')).toHaveCount(1);
});

test('WebGL context loss reveals the fallback board', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.galaxy-field')).toHaveClass(/webgl-ready/);
  await page.locator('.galaxy-field canvas').evaluate((canvas) => {
    (canvas as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(page.locator('.galaxy-field')).not.toHaveClass(/webgl-ready/);
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  await page.locator('.touch-target').first().click();
  await page.locator('.touch-target.eligible').first().click();
  await expect(page.locator('line.committed')).toHaveCount(1);
});

test('Full HD field fills the screen and stays interactive after resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const dimensions = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/images/galaxy-macs0416.jpg';
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  expect(dimensions.width).toBeGreaterThanOrEqual(1920);
  expect(dimensions.height).toBeGreaterThanOrEqual(1080);
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.getByRole('img', { name: /Die result:/ })).toBeVisible();
  const board = await page.locator('.galaxy-field').boundingBox();
  expect(board!.width).toBeGreaterThan(1800);
  expect(board!.height).toBeGreaterThan(700);
  const before = await page.locator('.touch-target').first().getAttribute('cx');
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(page.locator('.touch-target').first()).not.toHaveAttribute('cx', before!);
  await page.locator('.touch-target').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('.touch-target.eligible').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('line.committed')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(640);
});

test('background selection previews both images and survives a resumed match', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('radio', { name: 'Hubble · Galaxy cluster' })).toBeChecked();
  await page.getByRole('radio', { name: 'Webb · JADES deep field' }).check();
  await expect(page.locator('.universe-backdrop')).toHaveCSS(
    'background-image',
    /galaxy-jades.png/,
  );
  const image = page.locator('.background-options img').last();
  await expect
    .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBe(2000);
  await page.getByRole('button', { name: 'Start match' }).click();
  await expect(page.locator('.star-marker')).toHaveCount(30);
  await expect(page.locator('.star-marker').first()).toHaveCSS('stroke', 'rgb(121, 231, 255)');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Webb · JADES deep field' })).toBeChecked();
  await page.getByRole('button', { name: 'Resume match' }).click();
  await expect(page.locator('.universe-backdrop')).toHaveCSS(
    'background-image',
    /galaxy-jades.png/,
  );
  await expect(page.locator('.galaxy-credit')).toContainText('JADES Collaboration');
});
