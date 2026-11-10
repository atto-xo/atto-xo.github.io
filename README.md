# Atto XO · Marketing site

The public-facing Atto XO marketing website, now built with **Astro** instead of Jekyll, Hugo, or a hand-maintained root `index.html`.

**Brand:** atto x💙 — the royal-blue heart stands in for the “o” in XO.

**Product:** Atto XO is an early-stage, Rust-first trading research and decision-support platform for **human traders**. The intended research pipeline uses **nonlinear regression models** to investigate intraday signals and **MIP/MILP optimization** to evaluate feasible trade selections, sizing, and hard risk constraints. Paper recommendations come first; real-money brokerage execution is not enabled or advertised by this site.

## Local development

Requires Node.js 22.12+ (CI uses Node 24).

```bash
npm install
npm run dev
npm run build
npm test
```

Astro emits static pages to `dist/`. No server-side runtime or secrets are required. `npm test` expects `npm run build` first.

### Pages deployment

The GitHub Actions workflow in `.github/workflows/site.yml` verifies the website on pull requests and deploys `dist/` after a successful build on `main`.

1. In repository **Settings → Pages**, choose **GitHub Actions** as the build/deployment source.
2. Confirm that Pages is enabled for this public repository, with **GitHub Actions** selected as the publishing source.
3. Merge the marketing site PR after the build and content checks pass.
4. Confirm that `https://atto-xo.github.io/` resolves and review the live mobile/desktop page.

Because the repository name is `atto-xo.github.io`, Astro's `site` is `https://atto-xo.github.io` and no repository subpath (`base`) is needed. The build is intentionally **not** a Jekyll/Hugo pipeline.

The initial migration uses `npm install` because a verified lockfile has not yet been generated. **Reproducible dependency resolution remains an open release gate:** generate and commit `package-lock.json` from a trusted registry resolution, switch CI to `npm ci`, and retain dependency provenance before a release freeze.

### Deployment safeguards

Pull requests build and test without publishing. Artifact upload and deployment require `refs/heads/main`, including manually dispatched runs. Checkout does not persist repository credentials in the runner workspace, and all four first-party workflow actions are pinned to reviewed commit SHAs. A green CI run does not replace a review of public claims and disclosures.

## Copy standards and design principles

- Never advertise measured returns, outperforming benchmarks, guaranteed profitability, or live model signals without independently reviewed evidence.
- Label illustrative dashboard curves and candidate cards as simulated/conceptual.
- Treat the proposed **10-minute** cycle, **8-minute** publishing window, and cap of **five** ranked candidates as **design targets**, not validated operating service levels.
- Distinguish what a nonlinear model estimates from what a MIP/MILP optimizer allows under budget and risk constraints.
- Human traders retain decision authority; execution would require its own authorization, security review, and product gating.
- Never bundle API keys, private research data, client positions, credentials, or financial records into public static assets.

## Structure

```text
src/pages/index.astro       Main marketing experience
src/pages/404.astro         Custom not-found page
src/styles/global.css       Responsive, accessible dark/royal-blue design
public/favicon.svg          X-heart brand icon
public/og-preview.svg       Social sharing graphic
public/sitemap.xml          Canonical crawler sitemap
public/robots.txt           Crawler policy and sitemap discovery
tests/site.test.mjs         Built-page, navigation, and claims tests
.github/workflows/site.yml  Static verification and GitHub Pages deployment
tools/rust-bootstrap/       Preserved repository validation helper
```

## Related repositories

- [Atto XO organization](https://github.com/atto-xo)
- [Developer documentation](https://github.com/atto-xo/atto-xo-docs) (may require access)
- [Architecture RFCs](https://github.com/atto-xo/atto-xo-rfcs) (may require access)
- [Contracts and interfaces](https://github.com/atto-xo/atto-xo-interfaces) (may require access)
- [Conformance tests](https://github.com/atto-xo/atto-xo-conformance-tests) (may require access)

**Financial risk disclosure:** This is an in-development research product, not investment advice or an offer of live brokerage execution. Trading can result in loss of capital.
