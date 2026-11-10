import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { test, expect } from '@playwright/test';

test('capture screenshots and navigation timings for public pages', async ({ page }, testInfo) => {
  for (const [route, label] of [['/', 'homepage'], ['/research-demo/', 'research-demo'], ['/architecture/', 'architecture']]) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    if (label === 'research-demo') {
      await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
    }
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        navigationType: navigation?.type ?? null,
        domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
        responseEndMs: Math.round(navigation?.responseEnd ?? 0),
        requestCount: performance.getEntriesByType('resource').length,
        externalScriptSources: [...document.scripts]
          .filter(script => script.src && new URL(script.src).origin !== location.origin)
          .map(script => script.src)
      };
    });
    expect(metrics.navigationType).toBe('navigate');
    expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
    expect(metrics.externalScriptSources).toEqual([]);
    const dir = resolve('qa-evidence', testInfo.project.name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, label + '-timing.json'), JSON.stringify({
      path: route, project: testInfo.project.name, ...metrics,
      caveat: 'One Chromium CI lab sample; not Lighthouse or field Core Web Vitals'
    }, null, 2) + '\n');
    await writeFile(join(dir, label + '-screenshot.png'),
      await page.screenshot({ fullPage: true, animations: 'disabled' }));
  }
});
