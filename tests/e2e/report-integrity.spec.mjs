import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('report download is byte-identical for the same settings and changes with inputs', async ({ page }) => {
  await page.goto('/research-demo/');
  const download = async () => {
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download synthetic JSON report' }).click()
    ]);
    return readFile(await file.path());
  };
  const a=await download();
  const b=await download();
  expect(a.equals(b)).toBe(true);
  const baseline=JSON.parse(a.toString('utf8'));
  expect(baseline.deterministic).toBe(true);
  expect(baseline.schema).toBe('atto-xo.synthetic-research.v1');
  await page.locator('#demo-scenario').selectOption('defensive');
  const changed=await download();
  expect(a.equals(changed)).toBe(false);
  const r=JSON.parse(changed.toString('utf8'));
  expect(r.limits).toEqual({budget:70,downsideLimit:7,maxUnits:2});
  expect(r.analysis.optimal.score).toBe(10);
  expect(changed.toString('utf8')).not.toContain('CANARY_DO_NOT_LEAK');
});

test('no portfolio position remains a permitted mathematical outcome under limiting sliders', async ({ page }) => {
  await page.goto('/research-demo/');
  const set = async(id, value) => page.locator(id).evaluate((node, next) => {
    node.value=String(next);
    node.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
  await set('#demo-budget',50);
  await set('#demo-risk',4);
  await set('#demo-units',1);
  await expect(page.locator('#total-score')).toHaveText('7');
  await expect(page.locator('[data-reason="b"]')).toContainText('downside');
  await expect(page.locator('#demo-status')).toContainText('combinations satisfy all selected limits');
  await expect(page.locator('#rejection-stats')).toContainText('Overlapping violations');
});
