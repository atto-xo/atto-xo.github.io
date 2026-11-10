import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_CANDIDATES, solvePortfolio } from '../src/lib/research-demo.mjs';
import {
  SYNTHETIC_SCENARIOS, validateDemoLimits, explainSyntheticAllocation,
  evaluateSyntheticSensitivity, compareSyntheticScenarios, createSyntheticReport
} from '../src/lib/research-demo-v2.mjs';

test('scenario presets are distinct and do not change immutable fixtures', () => {
  assert.deepEqual(SYNTHETIC_SCENARIOS.map(s => s.id), ['balanced', 'defensive', 'exploratory']);
  for (const preset of SYNTHETIC_SCENARIOS) {
    assert.equal(Object.isFrozen(preset), true);
    assert.ok(solvePortfolio(preset).feasible > 0);
  }
  assert.deepEqual(compareSyntheticScenarios().map(x => x.id), SYNTHETIC_SCENARIOS.map(x => x.id));
});

test('validated limits reject malformed, fractional and overflowing values', () => {
  for (const bad of [null, undefined, [], 5, { budget: 20 },
    { budget: Infinity, downsideLimit: 2, maxUnits: 1 },
    { budget: 20.5, downsideLimit: 2, maxUnits: 1 },
    { budget: -1, downsideLimit: 2, maxUnits: 1 },
    { budget: 20, downsideLimit: NaN, maxUnits: 1 },
    { budget: 20, downsideLimit: 2, maxUnits: 10001 }]) {
    assert.throws(() => explainSyntheticAllocation(bad));
  }
  assert.deepEqual(validateDemoLimits({ budget: 40, downsideLimit: 5, maxUnits: 1, ignored: 77 }),
    { budget: 40, downsideLimit: 5, maxUnits: 1 });
});

test('rejection reasons distinguish infeasible constraints from suboptimal choices', () => {
  const low = explainSyntheticAllocation({ budget: 50, downsideLimit: 4, maxUnits: 1 });
  assert.equal(low.optimal.score, 7);
  assert.equal(low.candidates.find(c => c.id === 'a').status, 'selected');
  assert.deepEqual(low.candidates.find(c => c.id === 'b').blockingConstraints, ['downside']);
  assert.deepEqual(low.candidates.find(c => c.id === 'c').blockingConstraints, ['downside']);
  const defaultCase = explainSyntheticAllocation({ budget: 90, downsideLimit: 12, maxUnits: 4 });
  assert.equal(defaultCase.optimal.score, solvePortfolio(defaultCase.limits).score);
  assert.equal(defaultCase.candidates.length, 3);
  assert.ok(defaultCase.candidates.some(c => c.status === 'outscored' || c.status === 'tie-break'));
  assert.ok(defaultCase.candidates.every(c => c.status === 'selected' || c.status === 'infeasible' ||
    c.status === 'outscored' || c.status === 'tie-break'));
});

test('seeded constraint fuzz keeps reasons, forced optima and rejection counts consistent', () => {
  let seed = 0x0ff1ce;
  const next = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed;
  };
  for (let trial = 0; trial < 600; trial++) {
    const limits = {
      budget: next() % 161,
      downsideLimit: next() % 28,
      maxUnits: next() % 8
    };
    const a = explainSyntheticAllocation(limits);
    const global = solvePortfolio(limits);
    assert.equal(a.optimal.score, global.score);
    assert.equal(a.enumeration.examined, 48);
    assert.equal(a.enumeration.feasible, global.feasible);
    assert.equal(a.enumeration.rejected + a.enumeration.feasible, 48);
    for (const c of a.candidates) {
      const candidate = DEMO_CANDIDATES.find(d => d.id === c.id);
      if (c.status === 'selected') assert.ok(c.units > 0);
      else if (c.status === 'infeasible') {
        assert.ok(c.blockingConstraints.length > 0);
        assert.ok(candidate.cost > limits.budget ||
          candidate.downside > limits.downsideLimit || limits.maxUnits === 0);
      } else {
        assert.ok(c.scoreGap >= 0);
        assert.equal(c.forcedBestScore + c.scoreGap, global.score);
        assert.equal(c.units, 0);
        // Independent reference: enumerate every forced allocation.
        let bestForced = -1;
        const [x, y, z] = DEMO_CANDIDATES;
        for (let i = 0; i <= x.unitCap; i++) for (let j = 0; j <= y.unitCap; j++)
          for (let k = 0; k <= z.unitCap; k++) {
            const counts = [i, j, k];
            if (counts[DEMO_CANDIDATES.indexOf(candidate)] === 0) continue;
            if (i*x.cost + j*y.cost + k*z.cost > limits.budget) continue;
            if (i*x.downside + j*y.downside + k*z.downside > limits.downsideLimit) continue;
            if (i+j+k > limits.maxUnits) continue;
            bestForced = Math.max(bestForced, i*x.score + j*y.score + k*z.score);
          }
        assert.equal(c.forcedBestScore, bestForced);
      }
    }
    for (const sensitivity of evaluateSyntheticSensitivity(limits)) {
      assert.ok(sensitivity.delta >= 0, 'relaxing a constraint must not worsen score');
      assert.equal(sensitivity.score - sensitivity.baselineScore, sensitivity.delta);
    }
  }
});

test('report is local, deterministic, serializable and explicitly synthetic', () => {
  const limits = { budget: 90, downsideLimit: 12, maxUnits: 4 };
  const a = createSyntheticReport(limits);
  const b = createSyntheticReport(limits);
  assert.deepEqual(a, b);
  assert.equal(a.schema, 'atto-xo.synthetic-research.v1');
  assert.match(a.disclaimer, /No market forecasts/);
  assert.equal(a.analysis.optimal.score, solvePortfolio(limits).score);
  assert.equal(a.scenarioComparisons.length, 3);
  assert.equal(a.sensitivity.length, 3);
  assert.ok(!JSON.stringify(a).includes('api_key'));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
});
