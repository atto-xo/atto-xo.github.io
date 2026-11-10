import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dist = resolve('dist');
const homePath = join(dist, 'index.html');
const home = existsSync(homePath) ? readFileSync(homePath, 'utf8') : '';

test('Astro builds the home page and a useful 404 page', () => {
  assert.ok(home, 'Expected dist/index.html; run npm run build first');
  assert.ok(existsSync(join(dist, '404.html')), 'Missing static 404 page');
  assert.match(home, /<html[^>]*lang="en"/);
  assert.match(home, /<main\b[^>]*id="main"/);
  assert.match(home, /<title>Atto XO/);
});

test('primary navigation and calls to action reference existing sections', () => {
  const ids = new Set([...home.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  const targets = [...home.matchAll(/\bhref="#([^"]+)"/g)].map(m => m[1]);
  assert.ok(targets.length >= 8, 'Expected functional internal navigation');
  for (const target of targets) {
    assert.ok(ids.has(target), 'Broken section link: #' + target);
  }
});

test('core explanation covers nonlinear regression, MIP/MILP, and human choice', () => {
  for (const phrase of [
    /nonlinear regression/i,
    /mixed-integer/i,
    /MIP &amp; MILP optimization/i,
    /human trader/i,
    /model/i,
    /optimize/i,
    /decide/i,
  ]) assert.match(home, phrase);
});

test('research limitations and risk disclosure remain visible', () => {
  assert.match(home, /in development/i);
  assert.match(home, /illustrative/i);
  assert.match(home, /not live trading data/i);
  assert.match(home, /Nothing here is financial advice[^<]*guarantee of returns/i);
  assert.match(home, /loss of capital/i);
  assert.match(home, /Human decision required/i);
});

test('performance figures are labeled as targets rather than results', () => {
  assert.match(home, /Target research cycle/);
  assert.match(home, /Target publication window/);
  assert.match(home, /not claims of demonstrated production performance/i);
  assert.match(home, /not a delivery guarantee/i);
});

test('published metadata and favicon use the correct public origin', () => {
  assert.match(home, /rel="canonical" href="https:\/\/atto-xo.github.io\/"/);
  assert.match(home, /rel="icon" href="\/favicon.svg"/);
  const faviconPath = join(dist, 'favicon.svg');
  assert.ok(existsSync(faviconPath));
  const favicon = readFileSync(faviconPath, 'utf8');
  assert.match(favicon, /#326BFF/i);
  assert.ok(existsSync(join(dist, 'og-preview.svg')));
});

test('site is static and never implies a functioning trading execution flow', () => {
  assert.doesNotMatch(home, /<form\b/i);
  assert.doesNotMatch(home, /<script[^>]+src=["']https?:\/\//i);
  assert.match(home, /No trading account or execution is offered here/i);
});

test('site remains responsive and supports reduced motion', () => {
  const assetsDir = join(dist, '_astro');
  assert.ok(existsSync(assetsDir), 'Expected compiled Astro styles');
  const sourceStyles = readFileSync(resolve('src/styles/global.css'), 'utf8');
  assert.match(sourceStyles, /@media\(max-width:620px\)/);
  assert.match(sourceStyles, /prefers-reduced-motion:reduce/);
  assert.match(sourceStyles, /:focus-visible/);
});


test('X-heart identity uses a royal-blue pill and white-rimmed blue heart across the site', () => {
  const css = readFileSync(resolve('src/styles/global.css'), 'utf8');
  assert.match(css, /\.brand\{[^}]*border:1\.5px solid var\(--royal\);border-radius:999px/);
  assert.match(css, /\.brand-heart\{[^}]*fill:var\(--royal\);stroke:#fff;stroke-width:1\.5px/);
  assert.match(css, /\.cta-insignia svg\{[^}]*fill:var\(--royal\);stroke:#fff/);
  assert.match(home, /class="brand"[^>]*aria-label="Atto XO home"/);
  assert.match(home, /class="brand footer-brand"[^>]*aria-label="Atto XO home"/);

  const notFound = readFileSync(join(dist, '404.html'), 'utf8');
  assert.match(notFound, /class="brand error-brand"[^>]*aria-label="Atto XO home"/);
  assert.match(notFound, /class="brand-heart"/);

  const favicon = readFileSync(join(dist, 'favicon.svg'), 'utf8');
  assert.match(favicon, /fill="#326BFF" stroke="#FFFFFF"/);

  const socialPreview = readFileSync(join(dist, 'og-preview.svg'), 'utf8');
  assert.match(socialPreview, /rx="56"[^>]*stroke="#326bff"/);
  assert.match(socialPreview, /fill="#326bff" stroke="#ffffff"/);
});


test('crawler files discover only the canonical public home page', () => {
  const robotsPath = join(dist, 'robots.txt');
  const sitemapPath = join(dist, 'sitemap.xml');
  assert.ok(existsSync(robotsPath), 'Missing robots.txt');
  assert.ok(existsSync(sitemapPath), 'Missing sitemap.xml');
  const robots = readFileSync(robotsPath, 'utf8');
  const sitemap = readFileSync(sitemapPath, 'utf8');
  assert.match(robots, /^User-agent:\s*\*$/m);
  assert.match(robots, /^Allow:\s*\/$/m);
  assert.match(robots, /^Sitemap:\s*https:\/\/atto-xo\.github\.io\/sitemap\.xml$/m);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), ['https://atto-xo.github.io/']);
  assert.doesNotMatch(sitemap, /404\.html/);
});

test('fragment links, heading references, and element identifiers are valid', () => {
  const allIds = [...home.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(allIds).size, allIds.length, 'Duplicate element ID');
  const ids = new Set(allIds);
  for (const [, target] of home.matchAll(/\bhref="#([^"]+)"/g)) {
    assert.ok(ids.has(target), 'Unresolved fragment: #' + target);
  }
  for (const [, refs] of home.matchAll(/\baria-labelledby="([^"]+)"/g)) {
    for (const id of refs.split(/\s+/)) {
      assert.ok(ids.has(id), 'Unresolved heading reference: ' + id);
    }
  }
  assert.match(home, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(home, /<summary aria-label="Toggle navigation">/);
});

test('anchors use secure destinations and protect new windows', () => {
  for (const [, attributes] of home.matchAll(/<a\b([^>]*)>/g)) {
    const href = attributes.match(/\bhref="([^"]+)"/)?.[1];
    assert.ok(href, 'Anchor without href');
    assert.ok(href.startsWith('#') || href.startsWith('/') || href.startsWith('https://'),
      'Unexpected or insecure link: ' + href);
    if (/\btarget="_blank"/.test(attributes)) {
      assert.match(attributes, /\brel="[^"]*\bnoopener\b[^"]*"/);
    }
  }
});

test('manual dispatch cannot bypass main-only Pages publication', () => {
  const workflow = readFileSync(resolve('.github/workflows/site.yml'), 'utf8');
  const gate = "github.ref == 'refs/heads/main' && github.event_name != 'pull_request'";
  assert.equal(workflow.split(gate).length - 1, 2, 'Both upload and deploy require main');
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
});
