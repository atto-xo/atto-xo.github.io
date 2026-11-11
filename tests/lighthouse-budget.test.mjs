import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Lighthouse lab budgets enforce meaningful nonzero minimums and upper limits', () => {
  const json = JSON.parse(readFileSync(resolve('tools/lighthouse-budgets.json'), 'utf8'));
  for (const name of ['performance', 'accessibility', 'best-practices', 'seo']) {
    const score = json.categoryMinimum[name];
    assert.ok(typeof score === 'number' && score >= 0.8 && score <= 1,
      'Minimum lab score missing or weakened: ' + name);
  }
  for (const name of ['cumulative-layout-shift', 'largest-contentful-paint']) {
    assert.ok(Number.isFinite(json.metricMaximum[name]) && json.metricMaximum[name] > 0);
  }
  assert.ok(json.metricMaximum['cumulative-layout-shift'] <= 0.15);
  assert.ok(json.metricMaximum['largest-contentful-paint'] <= 4000);
  const script = readFileSync(resolve('tools/audit-lighthouse.mjs'), 'utf8');
  assert.match(script, /lighthouse-budgets\.json/);
  assert.match(script, /--only-categories=performance,accessibility,best-practices,seo/);
  assert.match(script, /--form-factor=mobile/);
});
