# ADR 0002: E2E Testing Tool

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The Technical Specification (§10.3) requires End-to-End tests verifying key user scenarios (PR creation, code review, push/pull) in NoAuth mode. The project already uses Vitest for unit/component tests (jsdom), but E2E tests need a real browser environment with navigation, user interaction, and network request validation.

## Alternatives Considered

### Playwright (Recommended)

- Mature cross-browser support (Chromium, Firefox, WebKit) — matches the MVP's need to validate in all target browsers.
- Native TypeScript support with strict typing.
- `webServer` config automatically starts and stops the dev server alongside tests.
- Auto-wait, web-first assertions, trace viewer — productive debugging.
- Large community, well-maintained (Microsoft).
- `@playwright/test` provides `test`/`expect` with no global pollution, compatible with the project's `verbatimModuleSyntax`.

### Cypress

- Strong interactive test runner, but limited to Chromium-based browsers (Firefox/WebKit in beta/experimental).
- `cy.` chain API is less idiomatic with TypeScript strict mode.
- Requires a separate Cypress configuration and dev-server plugin; no built-in `webServer` in the free version.
- Larger dependency footprint.

### Vitest Browser Mode

- Runs tests inside a real browser using Playwright as the automation layer, reusing Vitest's runner.
- Attractive for keeping a single test framework, but experimental; matchers and assertions are Vitest-native (less specialised for E2E patterns).
- No `webServer` orchestration — requires manual dev-server management.
- Higher risk for an MVP project.

## Decision

**Use Playwright 1 (`@playwright/test`) as the E2E testing tool.**

The E2E test suite is entirely separate from Vitest:
- Unit/component tests: `npm run test` (Vitest, `src/**/*.test.*`).
- E2E tests: `npm run test:e2e` (Playwright, `tests/e2e/**/*.spec.ts`).

## Consequences

### Positive
- Mature, well-documented tool with WebKit support — critical for cross-browser validation.
- `webServer` in `playwright.config.ts` automates dev-server lifecycle.
- Separate test gate (`test:e2e`) keeps the fast Vitest loop unmodified.
- Trace viewer and HTML reporter simplify CI debugging.

### Negative
- Additional dependency (~30 MB + browser binaries ~500 MB).
- CI needs `npx playwright install --with-deps` (requires sudo on Linux).
- `tsconfig.json` must include `"node"` in `types` for `process.env` used in config.
- E2E tests are slower than unit tests — not intended for every save, but required before merging.

## Open Questions

- CI pipeline specifics (GitHub Actions runner, caching `~/.cache/ms-playwright`) are deferred until a CI workflow is introduced.
- Future E2E scenario coverage for Git operations (clone/push via HTTP) will be added in separate tests per the MVP spec.
