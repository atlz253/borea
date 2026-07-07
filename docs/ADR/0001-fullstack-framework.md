# ADR 0001: Full-Stack TypeScript Framework

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The project (working title: Nirvana) is an open-source software development workspace — an analogue of JetBrains Space and Yandex SourceCraft. The MVP requires a Git hosting service with basic functionality implemented as a modular monolith, deployable as a single Docker container.

The Technical Specification ([docs/archive/MVP.md](../../docs/archive/MVP.md)) explicitly lists the TanStack ecosystem as the preferred full-stack foundation (Section 6.1) but leaves the final framework choice open for validation before implementation begins.

Key technical requirements that constrain framework choice:

- **Git smart-HTTP protocol** — MVP requires HTTP clone/push (Section 4.2), which means streaming binary protocol handling for `info/refs`, `git-upload-pack`, and `git-receive-pack` endpoints. The framework must provide raw request/response access without buffering.
- **REST API with OpenAPI** (Section 4.5, 14.1) — auto-generated OpenAPI specification from code-first schemas.
- **Single Docker container** (Section 12.1) — the full application (frontend, backend, Git HTTP) must run in a single process.
- **Provider abstractions** (Section 8) — GitProvider, DatabaseProvider, AuthProvider are core architectural interfaces; the server layer must support a clean dependency injection / provider pattern.
- **Self-hosted + future SaaS** — the framework must be portable across environments (bare metal, VPS, cloud) without vendor lock-in.
- **React-based** — Section 6.1 requires TanStack ecosystem (Router, Query, Table), which is React-native.

At the time of this decision, the repository is at the greenfield stage — only `docs/archive/MVP.md` exists, no prior code decisions constrain the choice.

## Alternatives Considered

### TanStack Start (RC)

- **Status:** Release Candidate — feature-complete, preparing for 1.0. Listed on Thoughtworks Technology Radar Vol. 34 (Assess). Used in production by Lovable.
- **Routing:** File-based, fully type-safe route tree via TanStack Router. Critical for complex Git URL patterns like `/repo/$owner/$repo/blob/$branch/*path`.
- **Server:** Built on Nitro (H3) — portable Node.js runtime, supports streaming via `event.node`, raw request/response access for Git protocol.
- **API layer:** Server functions (`createServerFn`) for UI data + server routes for REST endpoints.
- **OpenAPI:** Requires manual integration with `@asteasolutions/zod-to-openapi` using Zod schemas.
- **Deploy:** Nitro preset for Node.js — single Docker container is straightforward.
- **Ecosystem:** Native TanStack Router/Query/Table integration — matches spec Section 6.1 exactly.

### Next.js (App Router)

- **Routing:** File-based, but type safety is weaker — route parameters and search params are not fully typed out of the box.
- **Server:** Route Handlers support Node.js streaming for Git protocol.
- **API layer:** Route Handlers and Server Actions.
- **OpenAPI:** Third-party libraries only (e.g., `next-openapi`).
- **Deploy:** Self-hostable but Vercel-oriented; requires careful configuration for single-container deploy.
- **Ecosystem:** Mature, large community, many auth/ORM integrations available.
- **Verdict:** Over-engineered for a self-hosted modular monolith; Vercel lock-in risk for future SaaS; does not align with spec Section 6.1.

### Remix / React Router v7

- **Routing:** Resource routes for API + loader/action model for UI data. Type safety is not first-class.
- **Server:** Resource routes support raw streaming.
- **OpenAPI:** Third-party libraries only.
- **Deploy:** Portable, self-host friendly.
- **Ecosystem:** Smaller than Next.js; React Router v7 merger is recent and ecosystem is still settling.
- **Verdict:** Weaker type safety than TanStack Router; spec explicitly names TanStack ecosystem.

## Decision

**Use TanStack Start (RC) as the full-stack TypeScript framework.**

Additionally:

- **API layer:** Native TanStack Start server routes combined with `@asteasolutions/zod-to-openapi` for OpenAPI specification generation. Zod schemas serve as the single source of truth for runtime validation and API documentation.
- **Git HTTP:** A dedicated server route (`/api/git/*`) with raw H3 access (`event.node.req`/`res`) delegating to the `GitProvider` abstraction. This keeps the binary protocol isolated from the UI and REST API layers.
- **Validation:** Zod throughout — schemas shared between server routes, OpenAPI generation, and React client.
- **No secondary server framework** — everything runs within the single Nitro-powered server process.

## Consequences

### Positive

- **Type-safe routing** — TanStack Router's typed route tree eliminates an entire class of bugs for complex Git URL patterns.
- **Ecosystem alignment** — native integration with TanStack Query (commit history, PR data), Table (file tree, commit lists), Router (typed links/params) matches the spec's explicit technology choices.
- **Portable deploy** — Nitro's Node.js preset outputs a single deployable that runs in any Node environment, suitable for both self-hosted MVP and future cloud deployments.
- **Single-process simplicity** — no need to wire up separate frontend/backend servers for MVP; one Docker container, one process.
- **Future-proof** — TanStack Start is approaching 1.0 with strong community momentum; migration path from RC to stable is well-documented (lock versions, track release notes).

### Negative

- **RC maturity** — not yet 1.0; requires version pinning, careful release tracking, and tolerance for minor API changes during the project lifetime.
- **Git streaming risk** — the feasibility of streaming `git-receive-pack` through Nitro without buffering has not been verified in a real end-to-end test. This is the single highest technical risk of the decision and must be validated via a de-risking spike before full implementation.
- **OpenAPI is manual** — unlike Hono's first-class `@hono/zod-openapi`, TanStack Start has no built-in OpenAPI support. Wiring `zod-openapi` to server routes requires manual setup and discipline to keep schemas in sync.
- **Smaller community** — fewer production references, examples, and third-party integrations compared to Next.js. Troubleshooting may be slower.

### Risks and Mitigations

1. **Git smart-HTTP streaming through Nitro**
   _Mitigation:_ Implement a de-risking spike that serves `info/refs` and `git-receive-pack` via a raw server route, then validates with a real `git clone` / `git push` over HTTP. This is the first implementation step.

2. **OpenAPI schema drift**
   _Mitigation:_ Use Zod schemas as the single source of truth for both validation and documentation; integrate `zod-openapi` generation into the build pipeline and verify against the spec on every PR.

3. **RC breaking changes**
   _Mitigation:_ Pin exact versions of `@tanstack/start`, `@tanstack/react-router`, and `@tanstack/react-query` in `package.json`. Monitor the TanStack Start release notes as part of the development workflow.

## Open Questions (Deferred)

The following decisions remain open per Section 15 of the Technical Specification and are not addressed by this ADR:

- Specific DBMS and ORM/DatabaseProvider implementation
- UI component library
- GitProvider implementation (system CLI vs isomorphic-git)
- Monorepo structure and package manager
- Project working name

These will be resolved in subsequent ADRs as implementation progresses.
