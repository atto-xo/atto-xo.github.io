import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
test('visual regression suite checks committed baselines and archived screenshots',()=>{
  const spec=readFileSync('tests/e2e/visual-baseline.spec.mjs','utf8');
  assert.match(spec,/VISUAL_BASELINE_RECORD/);
  assert.match(spec,/visual-fingerprints\.json/);
  assert.match(spec,/changedTiles/);
  assert.match(spec,/toBeLessThanOrEqual\(tolerance\)/);
  assert.match(spec,/qa-evidence\/visual/);
  if(!existsSync('tests/visual-baselines/visual-fingerprints.json')) {
    const workflow=readFileSync('.github/workflows/site.yml','utf8');
    assert.match(workflow,/VISUAL_BASELINE_RECORD=1/,'Bootstrap must explicitly enable recording');
  }
});
