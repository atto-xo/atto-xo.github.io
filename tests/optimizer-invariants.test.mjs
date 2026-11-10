import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DEMO_CANDIDATES, SYNTHETIC_SERIES, fitQuadratic, evaluateQuadratic, solvePortfolio } from '../src/lib/research-demo.mjs';
import { explainSyntheticAllocation, evaluateSyntheticSensitivity, createSyntheticReport, validateDemoLimits } from '../src/lib/research-demo-v2.mjs';

const C = DEMO_CANDIDATES;
function oracle(limits) {
  const valid = [];
  const rejected = { budget: 0, downside: 0, unitCap: 0 };
  for (let x = 0; x <= C[0].unitCap; x++) for (let y = 0; y <= C[1].unitCap; y++)
    for (let z = 0; z <= C[2].unitCap; z++) {
      const units = [x,y,z];
      const budget = units.reduce((sum, count, i) => sum + count * C[i].cost, 0);
      const downside = units.reduce((sum, count, i) => sum + count * C[i].downside, 0);
      const count = x+y+z;
      if (budget > limits.budget) rejected.budget++;
      if (downside > limits.downsideLimit) rejected.downside++;
      if (count > limits.maxUnits) rejected.unitCap++;
      if (budget > limits.budget || downside > limits.downsideLimit || count > limits.maxUnits) continue;
      const score = units.reduce((sum, n, i) => sum + n * C[i].score, 0);
      valid.push({ units, score, usedBudget: budget, usedDownside: downside });
    }
  const best = [...valid].sort((a,b) => b.score - a.score ||
    a.usedDownside - b.usedDownside || a.usedBudget - b.usedBudget)[0];
  return { best, valid, rejected };
}
let seed = 0xd05eed;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
}

test('4,096 seeded parameter sets match an independent integer oracle and every forced-candidate optimum', () => {
  for (let trial = 0; trial < 4096; trial++) {
    const limits = { budget: random() % 201, downsideLimit: random() % 42, maxUnits: random() % 10 };
    const ref = oracle(limits);
    const solution = solvePortfolio(limits);
    const explain = explainSyntheticAllocation(limits);
    assert.equal(ref.valid.length, solution.feasible, 'feasible count trial ' + trial);
    assert.equal(solution.examined, 48);
    assert.ok(ref.valid.length >= 1, 'zero-unit allocation always feasible');
    assert.deepEqual(solution, {...ref.best, feasible:ref.valid.length, examined:48});
    assert.deepEqual(explain.optimal, solution);
    assert.deepEqual(explain.enumeration.overlappingViolationCounts, ref.rejected);
    assert.equal(explain.enumeration.rejected + ref.valid.length, 48);
    for (const [i,candidate] of explain.candidates.entries()) {
      const forced = ref.valid.filter(v => v.units[i] >= 1).sort((a,b)=>
        b.score-a.score || a.usedDownside-b.usedDownside || a.usedBudget-b.usedBudget)[0];
      if (solution.units[i]) {
        assert.equal(candidate.status, 'selected');
        assert.equal(candidate.forcedBestScore, solution.score);
        continue;
      }
      if (!forced) {
        assert.equal(candidate.status, 'infeasible');
        assert.equal(candidate.forcedBestScore, null);
        assert.equal(candidate.scoreGap, null);
        const expected = [
          ...(C[i].cost > limits.budget ? ['budget']:[]),
          ...(C[i].downside > limits.downsideLimit ? ['downside']:[]),
          ...(limits.maxUnits === 0 ? ['unit cap']:[])
        ];
        assert.deepEqual(candidate.blockingConstraints, expected);
      } else {
        assert.ok(['outscored','tie-break'].includes(candidate.status));
        assert.equal(candidate.forcedBestScore, forced.score);
        assert.equal(candidate.scoreGap, solution.score-forced.score);
        assert.equal(candidate.status, candidate.scoreGap===0?'tie-break':'outscored');
        assert.deepEqual(candidate.blockingConstraints,[]);
      }
    }
  }
});

test('constraint-lattice metamorphic tests preserve objective monotonicity, with exact no-position cases', () => {
  for (let budget = 0; budget <= 120; budget += 10) for (let downsideLimit = 0; downsideLimit <= 30; downsideLimit += 3) {
    const limits = {budget, downsideLimit, maxUnits:3};
    const base=solvePortfolio(limits);
    assert.ok(solvePortfolio({...limits,budget:budget+10}).score >= base.score);
    assert.ok(solvePortfolio({...limits,downsideLimit:downsideLimit+1}).score >= base.score);
    assert.ok(solvePortfolio({...limits,maxUnits:4}).score >= base.score);
  }
  for(const limits of [
    {budget:0,downsideLimit:0,maxUnits:0},
    {budget:0,downsideLimit:10000,maxUnits:10000},
    {budget:10000,downsideLimit:0,maxUnits:10000},
    {budget:10000,downsideLimit:10000,maxUnits:0}
  ]) {
    const r=explainSyntheticAllocation(limits);
    assert.deepEqual(r.optimal.units,[0,0,0]);
    assert.equal(r.optimal.score,0);
    assert.equal(r.enumeration.feasible,1);
    assert.ok(r.candidates.every(c=>c.status==='infeasible'));
  }
  const unlimited=solvePortfolio({budget:10000,downsideLimit:10000,maxUnits:10000});
  assert.deepEqual(unlimited.units,C.map(c=>c.unitCap));
});

test('invalid and adversarial report limits fail closed rather than silently truncating', () => {
  const valid = {budget:90,downsideLimit:12,maxUnits:4};
  for(const field of ['budget','downsideLimit','maxUnits']) {
    for(const value of [-1,0.5,Infinity,-Infinity,NaN,10001,Number.MAX_SAFE_INTEGER,'42',null,[],{},true]) {
      const bad={...valid,[field]:value};
      assert.throws(()=>validateDemoLimits(bad));
      assert.throws(()=>explainSyntheticAllocation(bad));
      assert.throws(()=>createSyntheticReport(bad));
    }
  }
  for(const bad of [null,undefined,[],0,'bad',Object.create(null)]) {
    assert.throws(()=>createSyntheticReport(bad));
  }
  assert.deepEqual(validateDemoLimits({...valid,secret:'never retain'}),valid);
});

test('synthetic report bytes are deterministic, public-only, and internally consistent', () => {
  for(const limits of [
    {budget:0,downsideLimit:0,maxUnits:0},
    {budget:50,downsideLimit:4,maxUnits:1},
    {budget:90,downsideLimit:12,maxUnits:4},
    {budget:150,downsideLimit:25,maxUnits:6},
    {budget:10000,downsideLimit:10000,maxUnits:10000}
  ]) {
    const one=JSON.stringify(createSyntheticReport({...limits,secret:'CANARY_DO_NOT_LEAK'}));
    const two=JSON.stringify(createSyntheticReport(limits));
    assert.equal(one,two,'extra user-supplied fields must not leak into report');
    assert.ok(!one.includes('CANARY_DO_NOT_LEAK'));
    assert.ok(!/Date|timestamp|api_key|secret_value|account_number|access_token/i.test(one));
    const report=JSON.parse(two);
    assert.deepEqual(report.limits,limits);
    assert.equal(report.schema,'atto-xo.synthetic-research.v1');
    assert.equal(report.analysis.optimal.score,solvePortfolio(limits).score);
    assert.deepEqual(report.observations,[...SYNTHETIC_SERIES]);
    assert.equal(report.deterministic,true);
    assert.match(report.disclaimer,/Invented educational data/);
    assert.equal(typeof createHash('sha256').update(one).digest('hex'),'string');
  }
});

test('quadratic model correctly fits 250 independently generated exact quadratics', () => {
  for(let k=0;k<250;k++) {
    const a=(random()%300)/7-20;
    const b=(random()%250)/11-10;
    const c=(random()%120)/9-5;
    const values=Array.from({length:9},(_,i)=>{
      const x=2*i/8-1;
      return a+b*x+c*x*x;
    });
    const fit=fitQuadratic(values);
    for(let i=0;i<3;i++)assert.ok(Math.abs(fit.coefficients[i]-[a,b,c][i])<1e-7);
    assert.ok(Math.abs(fit.nextIllustrativePoint-evaluateQuadratic([a,b,c],1.25))<1e-7);
  }
});
