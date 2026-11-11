/**
 * Deterministic educational examples only.
 * Candidate scores, costs and downside units are invented and unrelated
 * to the quadratic illustration. No prices, live feeds or broker APIs.
 */
export const SYNTHETIC_SERIES = Object.freeze([100, 103, 101, 107, 106, 111, 109, 115, 114]);

export const DEMO_CANDIDATES = Object.freeze([
  Object.freeze({ id: 'a', name: 'Scenario A', cost: 20, downside: 4, score: 7, unitCap: 3 }),
  Object.freeze({ id: 'b', name: 'Scenario B', cost: 35, downside: 6, score: 10, unitCap: 2 }),
  Object.freeze({ id: 'c', name: 'Scenario C', cost: 25, downside: 5, score: 8, unitCap: 3 })
]);

function normalizedX(index, n) {
  return 2 * index / (n - 1) - 1;
}

export function evaluateQuadratic(coefficients, x) {
  if (!Array.isArray(coefficients) || coefficients.length !== 3 || !Number.isFinite(x)) {
    throw new TypeError('Expected three coefficients and a finite x');
  }
  return coefficients[0] + coefficients[1] * x + coefficients[2] * x * x;
}

export function fitQuadratic(observations = SYNTHETIC_SERIES) {
  if (!Array.isArray(observations) || observations.length < 3 ||
    observations.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new TypeError('Quadratic fit requires at least three finite observations');
  }
  const n = observations.length;
  const sums = [0, 0, 0, 0, 0];
  const targets = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const x = normalizedX(i, n);
    let power = 1;
    for (let p = 0; p <= 4; p++) {
      sums[p] += power;
      if (p <= 2) targets[p] += power * observations[i];
      power *= x;
    }
  }
  const rows = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => sums[row + col]).concat(targets[row]));
  // Partial-pivot Gaussian elimination on the normal equations. Input is bounded
  // and fixed in the web demonstration; no claim of production-grade numerics.
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    if (Math.abs(rows[pivot][col]) < 1e-10) throw new RangeError('Degenerate fit');
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const d = rows[col][col];
    for (let j = col; j <= 3; j++) rows[col][j] /= d;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const scale = rows[row][col];
      for (let j = col; j <= 3; j++) rows[row][j] -= scale * rows[col][j];
    }
  }
  const coefficients = rows.map(row => row[3]);
  const fitted = observations.map((_, i) => evaluateQuadratic(coefficients, normalizedX(i, n)));
  const nextX = normalizedX(n, n);
  return { coefficients, fitted, nextIllustrativePoint: evaluateQuadratic(coefficients, nextX) };
}

function checkLimit(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000) {
    throw new RangeError(label + ' must be a bounded nonnegative integer');
  }
}

/**
 * Exact exhaustive solution of a tiny, bounded integer-allocation example.
 * An educational MILP-like problem; NOT a production MILP solver.
 * If scores tie, choose less downside, then lower budget consumption.
 */
export function solvePortfolio({
  budget = 90, downsideLimit = 12, maxUnits = 4
} = {}) {
  checkLimit(budget, 'Budget');
  checkLimit(downsideLimit, 'Downside');
  checkLimit(maxUnits, 'Unit cap');
  let best = null;
  let examined = 0;
  let feasible = 0;
  for (let a = 0; a <= DEMO_CANDIDATES[0].unitCap; a++) {
    for (let b = 0; b <= DEMO_CANDIDATES[1].unitCap; b++) {
      for (let c = 0; c <= DEMO_CANDIDATES[2].unitCap; c++) {
        examined++;
        const units = [a, b, c];
        const usedBudget = units.reduce((sum, count, i) => sum + count * DEMO_CANDIDATES[i].cost, 0);
        const usedDownside = units.reduce((sum, count, i) => sum + count * DEMO_CANDIDATES[i].downside, 0);
        if (usedBudget > budget || usedDownside > downsideLimit || a + b + c > maxUnits) continue;
        feasible++;
        const score = units.reduce((sum, count, i) => sum + count * DEMO_CANDIDATES[i].score, 0);
        if (!best || score > best.score ||
          (score === best.score && usedDownside < best.usedDownside) ||
          (score === best.score && usedDownside === best.usedDownside && usedBudget < best.usedBudget)) {
          best = { units, score, usedBudget, usedDownside };
        }
      }
    }
  }
  // The zero-unit allocation is always feasible for the validated limits.
  return { ...best, examined, feasible };
}
