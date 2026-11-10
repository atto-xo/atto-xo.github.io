import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dist = resolve('dist');
const pages = [
  { path: 'index.html', canonical: 'https://atto-xo.github.io/' },
  { path: 'research-demo/index.html', canonical: 'https://atto-xo.github.io/research-demo/' },
  { path: 'architecture/index.html', canonical: 'https://atto-xo.github.io/architecture/' }
];
function attrs(html, tag) {
  return [...html.matchAll(new RegExp('<' + tag + '\\b([^>]*)>', 'gi'))].map(match => match[1]);
}
test('public pages have canonical and social metadata with matching sitemap locations', () => {
  const urls = new Set();
  for (const page of pages) {
    const htmlPath = join(dist, page.path);
    assert.ok(existsSync(htmlPath), 'Missing published page: ' + page.path);
    const html = readFileSync(htmlPath, 'utf8');
    const links = attrs(html, 'link').filter(item => /rel="canonical"/.test(item));
    assert.equal(links.length, 1, 'Exactly one canonical is required on ' + page.path);
    assert.ok(links[0].includes('href="' + page.canonical + '"'));
    assert.ok(!urls.has(page.canonical), 'Duplicate canonical');
    urls.add(page.canonical);
    for (const property of ['og:type','og:title','og:description','og:url','og:image','og:image:alt']) {
      assert.ok(attrs(html, 'meta').some(item => item.includes('property="' + property + '"')),
        'Missing ' + property + ' on ' + page.path);
    }
    for (const name of ['description','twitter:card','twitter:title','twitter:description','twitter:image']) {
      assert.ok(attrs(html, 'meta').some(item => item.includes('name="' + name + '"')),
        'Missing ' + name + ' on ' + page.path);
    }
    assert.match(html, /property="og:image" content="https:\/\/atto-xo\.github\.io\/og-preview\.png"/);
    assert.match(html, /name="twitter:image" content="https:\/\/atto-xo\.github\.io\/og-preview\.png"/);
    assert.match(html, /Trading can result in loss of capital/i);
    assert.doesNotMatch(html, /<script[^>]*src="https?:\/\//i);
  }
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]),
    pages.map(page => page.canonical));
});

test('internal links in all published pages have valid emitted targets', () => {
  for (const page of pages) {
    const html = readFileSync(join(dist, page.path), 'utf8');
    for (const attributes of attrs(html, 'a')) {
      const href = attributes.match(/\bhref="([^"]+)"/)?.[1];
      assert.ok(href, 'Missing href on ' + page.path);
      if (href.startsWith('https://')) continue;
      if (href.startsWith('#')) {
        assert.ok(html.includes('id="' + href.slice(1) + '"'), 'Missing same-page fragment: ' + href);
        continue;
      }
      assert.ok(href.startsWith('/'), 'Unexpected or insecure link: ' + href);
      const pathname = new URL(href, 'https://atto-xo.github.io').pathname.replace(/^\/+/, '');
      const target = pathname.endsWith('/') || pathname === ''
        ? join(dist, pathname, 'index.html') : join(dist, pathname);
      assert.ok(existsSync(target), 'Broken built internal link ' + href + ' on ' + page.path);
    }
  }
});

test('QA evidence upload is pinned and intentionally not a deployment', () => {
  const workflow = readFileSync(resolve('.github/workflows/site.yml'), 'utf8');
  assert.match(workflow, /uses: actions\/upload-artifact@[a-f0-9]{40} # v6/);
  assert.match(workflow, /name: atto-xo-browser-evidence/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(workflow, /path: qa-evidence\//);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /if: always\(\)/);
});


test('raster social card is a real 1200x630 PNG with reviewed SVG retained', () => {
  const png = readFileSync(join(dist, 'og-preview.png'));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length > 10000 && png.length < 2000000, 'Unexpected social image size');
  const svg = readFileSync(join(dist, 'og-preview.svg'), 'utf8');
  assert.match(svg, /#326bff/i);
  assert.match(svg, /Find the signal/);
});
