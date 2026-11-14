import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/methodology.astro', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('research methodology discloses synthetic status and live execution separation', () => {
  assert.match(source, /in development/i);
  assert.match(source, /Synthetic scenarios are illustrative/i);
  assert.match(source, /no live trading account/i);
  assert.match(source, /not financial advice/i);
  assert.match(source, /loss of capital/i);
  assert.doesNotMatch(source, /<form\b/i);
  assert.doesNotMatch(source, /javascript:/i);
});

test('methodology has a canonical URL and discoverable footer link', () => {
  assert.match(source, /https:\/\/atto-xo\.github\.io\/methodology\//);
  assert.match(source, /<main[^>]+id="main"/);
  assert.match(source, /<h1>/);
  assert.match(source, /<html lang="en">/);
  assert.match(home, /href="\/methodology\/"/);
});
