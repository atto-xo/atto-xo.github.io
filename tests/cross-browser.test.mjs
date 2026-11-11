import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('real multi-engine browser verification remains enabled and pinned', () => {
  const playwright = readFileSync('playwright.config.mjs', 'utf8');
  for (const project of ['desktop-chromium', 'mobile-chromium',
    'small-mobile-chromium', 'desktop-firefox', 'desktop-webkit']) {
    assert.ok(playwright.includes("name: '" + project + "'"), 'Missing browser project ' + project);
  }
  assert.match(playwright, /devices\['Desktop Firefox'\]/);
  assert.match(playwright, /devices\['Desktop Safari'\]/);
  const workflow = readFileSync('.github/workflows/site.yml', 'utf8');
  assert.match(workflow, /npx playwright install --with-deps chromium firefox webkit/);
  assert.match(workflow, /npm run test:e2e/);
  assert.match(workflow, /if-no-files-found: error/);
});

test('cross-browser runner remains free of privileged data access', () => {
  const workflow = readFileSync('.github/workflows/site.yml', 'utf8');
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  const deployGate = "github.ref == 'refs/heads/main' && github.event_name == 'push'";
  assert.equal(workflow.split(deployGate).length - 1, 2);
});
