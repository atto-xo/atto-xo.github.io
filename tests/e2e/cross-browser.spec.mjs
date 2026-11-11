import { test, expect } from '@playwright/test';

test('all engines can render, navigate, and recompute synthetic allocations', async ({ page, browserName }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the signal.');
  await page.goto('/architecture/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Research you can examine.');
  await page.goto('/research-demo/');
  await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
  const scoreBefore = Number(await page.locator('#total-score').textContent());
  await page.locator('#demo-risk').evaluate(element => {
    element.value = '4';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#risk-value')).toHaveText('4 units');
  await expect(page.locator('#total-score')).toHaveText('7');
  expect(scoreBefore).toBeGreaterThan(7);
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth
  }));
  expect(width.scroll, 'unexpected page overflow in ' + browserName).toBeLessThanOrEqual(width.client + 1);
});

test('browser interaction never triggers market-data or trading requests', async ({ page }) => {
  const outbound = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (![
      'http://127.0.0.1:4321', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'
    ].includes(url.origin)) outbound.push(request.url());
  });
  await page.goto('/research-demo/');
  await page.locator('#demo-budget').evaluate(element => {
    element.value = '150';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#demo-risk').evaluate(element => {
    element.value = '25';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
  expect(outbound).toEqual([]);
});
