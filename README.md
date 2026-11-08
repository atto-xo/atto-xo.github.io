# atto-xo.github.io

> Public-facing product and developer information site.

**Status:** Initial scaffold and scoped future work; the README documents intent, not completed implementation.  
**Roadmap:** P2.

## Why it exists

Atto XO is a proposed Rust-first financial research and recommendation system with native desktop, Flutter and HTMX frontends. The target **10-minute** cycle freezes eligible data, runs linear/nonlinear/time-series and optional multimodal inference, optimizes feasible trade quantities under hard risk rules, then publishes at most **five ranked recommendations** within **8 minutes**. Results include instrument, side, USD notional, share/asset quantity, expected return, uncertainty, costs, risk decision and full data/model provenance. Paper recommendations are the initial mode; live brokerage execution would require separate explicit approvals.

This repository is intended to own **public-facing product and developer information site**.

## Responsibilities

- Describe the platform, product roadmap and responsible research limitations.
- Link versioned developer references and access-request workflows.
- Disclose risks, feature status and absence of guaranteed returns.

## Interfaces and boundaries

- **Primary deliverables:** A website with carefully reviewed product and technical information.
- **Explicit non-goal:** Exposing private documentation, credentials or personalized investment claims.
- **Cross-repo discipline:** Keep contracts versioned in [atto-xo-interfaces](https://github.com/atto-xo/atto-xo-interfaces), document owners and upstream/downstream dependencies, and distinguish proposals from executed evidence.

## Acceptance checklist

1. Review purpose, inputs, outputs, authorization and failure behavior in an RFC when cross-cutting.
2. Add concrete tests for correctness and failure paths; never equate test plans with executed test results.
3. Record exact component/data versions, licensing and security assumptions, and deadline impact.
4. Publish only reviewed, defensible, non-misleading material; never expose credentials or private trading data.

## Related repositories

- [atto-xo-docs](https://github.com/atto-xo/atto-xo-docs)
- [atto-xo-api-server.rs](https://github.com/atto-xo/atto-xo-api-server.rs)
- [atto-xo-rfcs](https://github.com/atto-xo/atto-xo-rfcs)

See [atto-xo-rfcs](https://github.com/atto-xo/atto-xo-rfcs) and [atto-xo-conformance-tests](https://github.com/atto-xo/atto-xo-conformance-tests) for shared contracts and verification policy.
