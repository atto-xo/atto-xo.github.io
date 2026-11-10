import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

test('synthetic scenario/report controls are built and linked to pure local modules', () => {
  const demo = readFileSync(join(resolve('dist'), 'research-demo/index.html'), 'utf8');
  const model = readFileSync(resolve('src/lib/research-demo-v2.mjs'), 'utf8');
  for (const text of ['demo-scenario', 'demo-download', 'data-scenario-row', 'data-sensitivity',
    'data-reason', 'rejection-stats']) assert.ok(demo.includes(text), 'Missing demo UI ' + text);
  assert.match(model, /createSyntheticReport/);
  assert.match(model, /explainSyntheticAllocation/);
  assert.match(model, /evaluateSyntheticSensitivity/);
  assert.match(demo, /Invented|synthetic/i);
  assert.doesNotMatch(demo, /<form\b/);
  assert.ok(existsSync(join(resolve('dist'), 'architecture/index.html')));
});
