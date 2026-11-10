import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('synthetic preset changes visible budget, risk, and score', async ({ page }) => {
  await page.goto('/research-demo/');
  await expect(page.locator('#demo-scenario')).toHaveValue('balanced');
  await page.locator('#demo-scenario').selectOption('defensive');
  await expect(page.locator('#budget-value')).toHaveText('70 units');
  await expect(page.locator('#risk-value')).toHaveText('7 units');
  await expect(page.locator('#units-value')).toHaveText('2 units');
  await expect(page.locator('#total-score')).toHaveText('10');
  await expect(page.locator('[data-reason="a"]')).toContainText('Forcing at least one unit');
  await page.locator('#demo-scenario').selectOption('exploratory');
  await expect(page.locator('#budget-value')).toHaveText('130 units');
  await expect(page.locator('#risk-value')).toHaveText('22 units');
  const score = Number(await page.locator('#total-score').textContent());
  expect(score).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Reset constraints' }).click();
  await expect(page.locator('#demo-scenario')).toHaveValue('balanced');
  await expect(page.locator('#budget-value')).toHaveText('90 units');
});

test('low downside shows true infeasibility, not a misleading optimizer exclusion', async ({ page }) => {
  await page.goto('/research-demo/');
  await page.locator('#demo-risk').evaluate(input => {
    input.value = '4';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#demo-scenario')).toHaveValue('custom');
  await expect(page.locator('[data-reason="b"]')).toContainText('one unit violates the downside');
  await expect(page.locator('[data-reason="c"]')).toContainText('one unit violates the downside');
  await expect(page.locator('#rejection-stats')).toContainText('Overlapping violations');
  await expect(page.locator('[data-sensitivity="downside"]')).toContainText('synthetic points');
});

test('all scenario comparisons and sensitivity deltas are populated without network calls', async ({ page }) => {
  const unknown = [];
  page.on('request', req => {
    const origin = new URL(req.url()).origin;
    if (!['http://127.0.0.1:4321','https://fonts.googleapis.com',
      'https://fonts.gstatic.com'].includes(origin)) unknown.push(req.url());
  });
  await page.goto('/research-demo/');
  for (const id of ['balanced', 'defensive', 'exploratory']) {
    const row = page.locator('[data-scenario-row="' + id + '"]');
    await expect(row.locator('[data-score]')).not.toHaveText('—');
  }
  for (const id of ['budget', 'downside', 'unit-cap']) {
    await expect(page.locator('[data-sensitivity="' + id + '"]')).toContainText('synthetic points');
  }
  expect(unknown).toEqual([]);
});

test('downloaded report is deterministic, synthetic and contains explanatory evidence', async ({ page }) => {
  await page.goto('/research-demo/');
  await page.locator('#demo-scenario').selectOption('defensive');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download synthetic JSON report' }).click()
  ]);
  expect(download.suggestedFilename()).toBe('atto-xo-synthetic-research.json');
  const path = await download.path();
  expect(path).toBeTruthy();
  const report = JSON.parse(await readFile(path, 'utf8'));
  expect(report.schema).toBe('atto-xo.synthetic-research.v1');
  expect(report.deterministic).toBe(true);
  expect(report.limits).toEqual({ budget: 70, downsideLimit: 7, maxUnits: 2 });
  expect(report.disclaimer).toMatch(/Invented educational data/);
  expect(report.analysis.optimal.score).toBe(10);
  expect(report.analysis.candidates).toHaveLength(3);
  expect(report.sensitivity).toHaveLength(3);
  expect(report.scenarioComparisons).toHaveLength(3);
  expect(report.quadratic.coefficients).toHaveLength(3);
  expect(JSON.stringify(report)).not.toMatch(/api_key|token|account_number|broker/i);
});
