// Reproduce the 1200x630 raster from the reviewed vector using lockfile-pinned Playwright.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const svg = await readFile('public/og-preview.svg', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const base64 = Buffer.from(svg, 'utf8').toString('base64');
  await page.setContent('<!doctype html><html><body style="margin:0;background:#090f21;overflow:hidden">' +
    '<img style="display:block;width:1200px;height:630px" width="1200" height="630" alt="" src="data:image/svg+xml;base64,' +
    base64 + '"></body></html>');
  await page.locator('img').evaluate(img => img.decode());
  const png = await page.screenshot({ type: 'png', animations: 'disabled' });
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
    throw new Error('Raster failed PNG dimension verification');
  }
  await writeFile('public/og-preview.png', png);
  console.log('Generated 1200x630 preview, bytes=' + png.length);
  console.log('PREVIEW_SHA256:' + createHash('sha256').update(png).digest('hex'));
  if (process.argv.includes('--receipt')) {
    const text = png.toString('base64');
    console.log('PREVIEW_BEGIN');
    for (let i = 0; i < text.length; i += 1200) console.log('PREVIEW_CHUNK:' + text.slice(i, i + 1200));
    console.log('PREVIEW_END');
  }
} finally {
  await browser.close();
}
