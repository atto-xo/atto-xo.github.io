import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('hero, concept label and financial risk disclosure are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the signal.');
  await expect(page.getByText('CONCEPT PREVIEW')).toBeVisible();
  await expect(page.getByText('SIMULATED DISPLAY · NO LIVE SIGNALS')).toBeVisible();
  await expect(page.getByText('Trading can result in loss of capital.', { exact: false })).toBeVisible();
});

test('navigation works in desktop and mobile layouts', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) {
    const menu = page.locator('details.mobile-menu');
    await menu.locator('summary').click();
    await expect(menu).toHaveAttribute('open', '');
    await menu.getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await menu.locator('summary').click();
    await expect(menu).not.toHaveAttribute('open', '');
  } else {
    await page.getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
  }
  await expect(page.locator('#how-it-works')).toBeVisible();
});

test('viewport has no horizontal page overflow', async ({ page }) => {
  await page.goto('/');
  const sizes = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
  // The shell clips overflow, so scrollWidth alone can miss clipped CTAs.
  const hero = await page.locator('.hero-copy').boundingBox();
  const container = await page.locator('.hero-grid').boundingBox();
  expect(hero.x + hero.width).toBeLessThanOrEqual(container.x + container.width + 1);
  for (const button of await page.locator('.hero-actions .button').all()) {
    const box = await button.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(container.x + container.width + 1);
  }
});

test('automated WCAG 2.1 A and AA audit passes', async ({ page }) => {
  await page.goto('/');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations.map(v => ({
    id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target)
  }))).toEqual([]);
});

test('reduced-motion preference removes smooth scroll behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(behavior).toBe('auto');
});

test('desktop keyboard can reach skip link and enter content', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, 'Virtual mobile keyboards do not expose a Tab key');
  await page.goto('/');
  // Safari on macOS uses Option-Tab to include links by default.
  // https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac
  await page.keyboard.press(process.platform === 'darwin' && browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
