/**
 * Deterministic educational interpretability layer over a fixed 48-combination
 * integer-allocation fixture. NOT trading advice or a real optimization service.
 */
import {
  DEMO_CANDIDATES, SYNTHETIC_SERIES, fitQuadratic, solvePortfolio
} from './research-demo.mjs';

export const SYNTHETIC_SCENARIOS = Object.freeze([
  Object.freeze({ id: 'balanced', name: 'Balanced illustration', budget: 90, downsideLimit: 12, maxUnits: 4 }),
  Object.freeze({ id: 'defensive', name: 'Constrained illustration', budget: 70, downsideLimit: 7, maxUnits: 2 }),
  Object.freeze({ id: 'exploratory', name: 'Expanded illustration', budget: 130, downsideLimit: 22, maxUnits: 6 })
]);
const FIELDS = ['budget', 'downsideLimit', 'maxUnits'];

export function validateDemoLimits(limits) {
  if (!limits || typeof limits !== 'object' || Array.isArray(limits)) {
    throw new TypeError('Expected a budget/downside/units object');
  }
  for (const field of FIELDS) {
    if (!Object.hasOwn(limits, field) ||
      !Number.isSafeInteger(limits[field]) ||
      limits[field] < 0 || limits[field] > 10000) {
      throw new RangeError(field + ' must be a bounded nonnegative integer');
    }
  }
  return Object.fromEntries(FIELDS.map(field => [field, limits[field]]));
}

function iterateAllocations(limits, accept) {
  let best = null;
  let feasible = 0;
  let examined = 0;
  const violations = { budget: 0, downside: 0, unitCap: 0 };
  const [a, b, c] = DEMO_CANDIDATES;
  for (let x = 0; x <= a.unitCap; x++) {
    for (let y = 0; y <= b.unitCap; y++) {
      for (let z = 0; z <= c.unitCap; z++) {
        examined++;
        const units = [x, y, z];
        const usedBudget = x * a.cost + y * b.cost + z * c.cost;
        const usedDownside = x * a.downside + y * b.downside + z * c.downside;
        const count = x + y + z;
        if (usedBudget > limits.budget) violations.budget++;
        if (usedDownside > limits.downsideLimit) violations.downside++;
        if (count > limits.maxUnits) violations.unitCap++;
        if (usedBudget > limits.budget || usedDownside > limits.downsideLimit ||
          count > limits.maxUnits) continue;
        feasible++;
        if (!accept(units)) continue;
        const score = x * a.score + y * b.score + z * c.score;
        if (!best || score > best.score ||
          (score === best.score && usedDownside < best.usedDownside) ||
          (score === best.score && usedDownside === best.usedDownside &&
            usedBudget < best.usedBudget)) {
          best = { units, score, usedBudget, usedDownside };
        }
      }
    }
  }
  return { best, feasible, examined, violations };
}

export function explainSyntheticAllocation(input) {
  const limits = validateDemoLimits(input);
  const optimal = solvePortfolio(limits);
  const scan = iterateAllocations(limits, () => true);
  if (scan.feasible !== optimal.feasible || scan.examined !== optimal.examined ||
    !scan.best || scan.best.score !== optimal.score ||
    scan.best.usedDownside !== optimal.usedDownside ||
    scan.best.usedBudget !== optimal.usedBudget) {
    throw new Error('Synthetic solver and explanatory enumeration disagree');
  }
  const candidates = DEMO_CANDIDATES.map((candidate, i) => {
    const units = optimal.units[i];
    if (units > 0) {
      return {
        id: candidate.id, name: candidate.name, units, status: 'selected',
        scoreGap: 0, forcedBestScore: optimal.score,
        blockingConstraints: [],
        explanation: units + ' unit(s) selected in the highest-scoring feasible allocation.'
      };
    }
    const blocks = [];
    if (candidate.cost > limits.budget) blocks.push('budget');
    if (candidate.downside > limits.downsideLimit) blocks.push('downside');
    if (limits.maxUnits === 0) blocks.push('unit cap');
    if (blocks.length) {
      return {
        id: candidate.id, name: candidate.name, units: 0, status: 'infeasible',
        scoreGap: null, forcedBestScore: null, blockingConstraints: blocks,
        explanation: 'Even one unit violates the ' + blocks.join(', ') + ' limit(s).'
      };
    }
    // Reoptimize the entire portfolio with at least one unit of this candidate.
    // This is NOT the same as adding a unit to the current allocation.
    const forced = iterateAllocations(limits, current => current[i] >= 1).best;
    if (!forced) throw new Error('Unexpected absence of a feasible forced allocation');
    const gap = optimal.score - forced.score;
    if (gap < 0) throw new Error('Forced candidate exceeded global optimum');
    const status = gap === 0 ? 'tie-break' : 'outscored';
    return {
      id: candidate.id, name: candidate.name, units: 0, status,
      scoreGap: gap, forcedBestScore: forced.score, blockingConstraints: [],
      explanation: gap === 0
        ? 'A forced allocation ties on score, but loses on downside or budget tie-breaking.'
        : 'Forcing at least one unit yields at most ' + forced.score +
          ' synthetic points, ' + gap + ' below the best feasible allocation.'
    };
  });
  return {
    limits, optimal,
    enumeration: {
      examined: scan.examined, feasible: scan.feasible,
      rejected: scan.examined - scan.feasible,
      overlappingViolationCounts: scan.violations
    },
    candidates
  };
}

export function compareSyntheticScenarios() {
  return SYNTHETIC_SCENARIOS.map(({ id, name, budget, downsideLimit, maxUnits }) => {
    const limits = { budget, downsideLimit, maxUnits };
    const optimal = solvePortfolio(limits);
    return { id, name, limits, score: optimal.score,
      usedBudget: optimal.usedBudget, usedDownside: optimal.usedDownside, units: [...optimal.units] };
  });
}

export function evaluateSyntheticSensitivity(input) {
  const limits = validateDemoLimits(input);
  const baseline = solvePortfolio(limits).score;
  const changes = [
    { id: 'budget', label: 'Budget +10', limits: { ...limits, budget: Math.min(10000, limits.budget + 10) } },
    { id: 'downside', label: 'Downside +2', limits: { ...limits, downsideLimit: Math.min(10000, limits.downsideLimit + 2) } },
    { id: 'unit-cap', label: 'Unit cap +1', limits: { ...limits, maxUnits: Math.min(10000, limits.maxUnits + 1) } }
  ];
  return changes.map(({ id, label, limits: next }) => {
    const score = solvePortfolio(next).score;
    if (score < baseline) throw new Error('Relaxed limit reduced optimal objective');
    return { id, label, baselineScore: baseline, score, delta: score - baseline };
  });
}

export function createSyntheticReport(input) {
  const limits = validateDemoLimits(input);
  const analysis = explainSyntheticAllocation(limits);
  const model = fitQuadratic([...SYNTHETIC_SERIES]);
  return {
    schema: 'atto-xo.synthetic-research.v1',
    disclaimer: 'Invented educational data only. No market forecasts, returns, investment advice or brokerage execution.',
    deterministic: true,
    observations: [...SYNTHETIC_SERIES],
    quadratic: {
      coefficients: [...model.coefficients],
      nextIllustrativePoint: model.nextIllustrativePoint,
      note: 'Quadratic least-squares extrapolation is not a market forecast.'
    },
    limits, analysis,
    scenarioComparisons: compareSyntheticScenarios(),
    sensitivity: evaluateSyntheticSensitivity(limits)
  };
}
