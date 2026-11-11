import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('bundled fonts and licenses match recorded upstream receipts', () => {
  const sources = JSON.parse(readFileSync('public/fonts/sources.json', 'utf8'));
  for (const [name, receipt] of Object.entries(sources)) {
    const bytes = readFileSync('public/fonts/' + name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256, name);
    if (name.endsWith('.woff2')) assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    else assert.match(bytes.toString(), /SIL OPEN FONT LICENSE/);
  }
});
