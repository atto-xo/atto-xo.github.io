// Reproducible Lighthouse mobile lab audits on locally previewed static output.
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const execFileAsync = promisify(execFile);
const origin = 'http://127.0.0.1:4321';
const outputDir = resolve('qa-evidence/lighthouse');
const routes = [{ path: '/', name: 'home' }, { path: '/research-demo/', name: 'research-demo' }];
const floors = { performance: 0.50, accessibility: 0.90, 'best-practices': 0.90, seo: 0.85 };
const budgets = { 'cumulative-layout-shift': 0.15, 'largest-contentful-paint': 7000 };
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function waitForPreview() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error('Astro static preview did not become ready');
}
const preview = spawn(resolve('node_modules/.bin/astro'),
  ['preview', '--host', '127.0.0.1', '--port', '4321'], {
    stdio: 'ignore', env: process.env
  });
try {
  await waitForPreview();
  await mkdir(outputDir, { recursive: true });
  const chromePath = chromium.executablePath();
  const summaries = [];
  for (const route of routes) {
    const outputPath = resolve(outputDir, route.name + '.report.json');
    await execFileAsync(resolve('node_modules/.bin/lighthouse'), [
      origin + route.path, '--quiet',
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json', '--output-path=' + outputPath, '--form-factor=mobile'
    ], {
      env: { ...process.env, CHROME_PATH: chromePath },
      timeout: 180000, maxBuffer: 1024 * 1024 * 4
    });
    const report = JSON.parse(await readFile(outputPath, 'utf8'));
    if (report.runtimeError) {
      throw new Error(route.name + ': Lighthouse runtime error ' + report.runtimeError.message);
    }
    const categories = Object.fromEntries(Object.keys(floors).map(key => [key, report.categories?.[key]?.score]));
    const metrics = Object.fromEntries(Object.keys(budgets).map(key => [key, report.audits?.[key]?.numericValue]));
    const summary = {
      route: route.path, categories, metrics, version: report.lighthouseVersion,
      type: 'single-run mobile Chromium CI lab; not field Core Web Vitals'
    };
    summaries.push(summary);
    console.log('Lighthouse lab: ' + JSON.stringify(summary));
    for (const [key, floor] of Object.entries(floors)) {
      if (typeof categories[key] !== 'number' || categories[key] < floor) {
        throw new Error(route.name + ': ' + key + ' score below ' + floor + ': ' + categories[key]);
      }
    }
    for (const [key, max] of Object.entries(budgets)) {
      if (typeof metrics[key] !== 'number' || metrics[key] > max) {
        throw new Error(route.name + ': ' + key + ' over ' + max + ': ' + metrics[key]);
      }
    }
  }
  await writeFile(resolve(outputDir, 'summary.json'), JSON.stringify(summaries, null, 2) + '\n');
} catch (error) {
  console.error('Lighthouse gate failed:', error);
  process.exitCode = 1;
} finally {
  preview.kill('SIGTERM');
}
