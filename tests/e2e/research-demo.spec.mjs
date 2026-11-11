import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing page links to a functioning research demo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /try the synthetic demo/i }).click();
  await expect(page).toHaveURL(/\/research-demo\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand the model.');
});

test('changing constraints recomputes a fully feasible allocation', async ({ page }) => {
  await page.goto('/research-demo/');
  await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
  const initial = await page.locator('#total-score').textContent();
  expect(Number(initial)).toBeGreaterThan(0);
  await page.locator('#demo-budget').evaluate(input => {
    input.value = '50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#demo-risk').evaluate(input => {
    input.value = '4';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#demo-units').evaluate(input => {
    input.value = '1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#budget-value')).toHaveText('50 units');
  await expect(page.locator('#risk-value')).toHaveText('4 units');
  await expect(page.locator('#used-risk')).toHaveText('4 / 4');
  await expect(page.locator('#total-score')).toHaveText('7');
  await expect(page.locator('[data-candidate="a"] [data-output="units"]')).toHaveText('1');
  await expect(page.locator('[data-candidate="b"] [data-output="units"]')).toHaveText('0');
  await page.getByRole('button', { name: 'Reset constraints' }).click();
  await expect(page.locator('#budget-value')).toHaveText('90 units');
  await expect(page.locator('#risk-value')).toHaveText('12 units');
});

test('research demo meets WCAG A/AA across viewport profiles', async ({ page }) => {
  await page.goto('/research-demo/');
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations.map(v => ({
    id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target)
  }))).toEqual([]);
});

test('demo does not overflow and makes no trading or data API requests', async ({ page }) => {
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  await page.goto('/research-demo/');
  await expect(page.locator('#demo-next-point')).not.toHaveText('—');
  await page.locator('#demo-risk').evaluate(input => {
    input.value = '20';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  const unapproved = requests.filter(url => {
    const origin = new URL(url).origin;
    return origin !== 'http://127.0.0.1:4321' &&
      !['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(origin);
  });
  expect(unapproved).toEqual([]);
  await expect(page.getByText('There is no buy, sell, account, order-routing, or execution capability', { exact: false })).toBeVisible();
});


test('horizontally scrolling candidate table is keyboard accessible', async ({ page }) => {
  await page.goto('/research-demo/');
  const tableRegion = page.getByRole('region', { name: 'Scrollable synthetic allocation table' });
  await expect(tableRegion).toHaveAttribute('tabindex', '0');
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();
});
