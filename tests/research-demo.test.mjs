import test from 'node:test';
import assert from 'node:assert/strict';
import { SYNTHETIC_SERIES, DEMO_CANDIDATES, evaluateQuadratic, fitQuadratic, solvePortfolio } from '../src/lib/research-demo.mjs';

test('quadratic least squares exactly recovers an artificial quadratic', () => {
  const n = 9;
  const observations = Array.from({ length: n }, (_, i) => {
    const x = 2 * i / (n - 1) - 1;
    return 30 + 3 * x + 7 * x * x;
  });
  const fit = fitQuadratic(observations);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(fit.coefficients[i] - [30, 3, 7][i]) < 1e-9);
  }
  assert.ok(Math.abs(fit.nextIllustrativePoint - evaluateQuadratic([30, 3, 7], 1.25)) < 1e-9);
  assert.equal(SYNTHETIC_SERIES.length, 9);
});

test('invalid model and optimizer parameters fail closed', () => {
  for (const input of [[], [1, 2], [1, 2, Infinity], [1, 2, NaN], ['1', 2, 3]]) {
    assert.throws(() => fitQuadratic(input), TypeError);
  }
  assert.throws(() => solvePortfolio({ budget: -1 }), RangeError);
  assert.throws(() => solvePortfolio({ budget: 1.5 }), RangeError);
  assert.throws(() => solvePortfolio({ downsideLimit: Infinity }), RangeError);
  assert.throws(() => solvePortfolio({ maxUnits: 10001 }), RangeError);
});

function independentReference({ budget, downsideLimit, maxUnits }) {
  let highScore = -Infinity;
  let bestDownside = Infinity;
  let bestBudget = Infinity;
  let feasible = 0;
  let examined = 0;
  const [x, y, z] = DEMO_CANDIDATES;
  for (let a = 0; a <= x.unitCap; a++) for (let b = 0; b <= y.unitCap; b++) for (let c = 0; c <= z.unitCap; c++) {
    examined++;
    const spent = a * x.cost + b * y.cost + c * z.cost;
    const risk = a * x.downside + b * y.downside + c * z.downside;
    if (spent > budget || risk > downsideLimit || a + b + c > maxUnits) continue;
    feasible++;
    const score = a * x.score + b * y.score + c * z.score;
    if (score > highScore || (score === highScore && risk < bestDownside) ||
       (score === highScore && risk === bestDownside && spent < bestBudget)) {
      highScore = score;
      bestDownside = risk;
      bestBudget = spent;
    }
  }
  return { score: highScore, usedDownside: bestDownside, usedBudget: bestBudget, feasible, examined };
}

test('integer allocation is optimal and obeys every constraint over a broad grid', () => {
  for (let budget = 0; budget <= 150; budget += 10) {
    for (let downsideLimit = 0; downsideLimit <= 26; downsideLimit += 2) {
      for (let maxUnits = 0; maxUnits <= 6; maxUnits++) {
        const input = { budget, downsideLimit, maxUnits };
        const output = solvePortfolio(input);
        assert.deepEqual({
          score: output.score, usedDownside: output.usedDownside,
          usedBudget: output.usedBudget, feasible: output.feasible,
          examined: output.examined
        }, independentReference(input));
        assert.ok(output.usedBudget <= budget && output.usedDownside <= downsideLimit);
        assert.ok(output.units.reduce((sum, n) => sum + n, 0) <= maxUnits);
        output.units.forEach((n, i) => {
          assert.ok(Number.isSafeInteger(n) && n >= 0 && n <= DEMO_CANDIDATES[i].unitCap);
        });
      }
    }
  }
});

test('relaxing a limit cannot reduce the optimal fictional score', () => {
  for (let risk = 0; risk < 25; risk++) {
    const lower = solvePortfolio({ budget: 110, downsideLimit: risk, maxUnits: 5 });
    const upper = solvePortfolio({ budget: 110, downsideLimit: risk + 1, maxUnits: 5 });
    assert.ok(upper.score >= lower.score);
  }
});
