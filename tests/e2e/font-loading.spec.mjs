import { test, expect } from '@playwright/test';

test('architecture remains stable when local fonts arrive late', async ({ page }) => {
  const fontRequests = [];
  await page.addInitScript(() => {
    window.reviewLayoutShift = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.reviewLayoutShift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  page.on('request', request => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });
  await page.route('**/fonts/*.woff2', async route => {
    await new Promise(done => setTimeout(done, 1000));
    await route.continue();
  });
  await page.goto('/architecture/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Research you can examine.');
  expect(fontRequests).toHaveLength(2);
  expect(fontRequests.every(url => url.startsWith('http://127.0.0.1:4321/fonts/'))).toBe(true);
  // Some engines do not implement LayoutShift observation. Chromium is the
  // measured CLS gate; all engines still verify local font loading and content.
  const measured = await page.evaluate(() => ({
    supported: PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
    shift: window.reviewLayoutShift
  }));
  if (measured.supported) expect(measured.shift).toBeLessThanOrEqual(0.15);
});
