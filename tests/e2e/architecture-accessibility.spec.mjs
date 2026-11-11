import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('architecture headings and navigation stay readable in every engine', async ({ page }) => {
  await page.goto('/architecture/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(244, 247, 255)');
  await expect(page.locator('.brand')).toHaveCSS('color', 'rgb(244, 247, 255)');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
});
