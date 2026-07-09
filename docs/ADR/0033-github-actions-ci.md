# ADR 0033: GitHub Actions CI

**Status:** Accepted
**Date:** 2026-07-09
**Author:** Architecture Team

## Context

Borea needs a repository-level CI gate that runs the same required checks
contributors are expected to run locally. The current documented checks cover
Biome, TypeScript, Vitest unit tests, integration tests, and Playwright E2E
tests. ADR 0002 selected Playwright and explicitly deferred CI pipeline
specifics until a workflow was introduced.

The test suite has different runtime characteristics. Formatting, linting, and
typechecking are fast. Vitest unit and integration tests can run independently.
The main Playwright suite targets Chromium, Firefox, and WebKit, while the
authentication and organization E2E suites use dedicated configs and run only on
Chromium.

## Decision

1. Add a GitHub Actions workflow at `.github/workflows/ci.yml`.
2. Trigger the workflow on pushes to `main` and `develop`, and allow manual
   execution with `workflow_dispatch`.
3. Use Node.js 22 in CI to match the Docker build and runtime image.
4. Use npm 11.6.2 in CI, matching the Docker build image, then install
   dependencies with `npm ci` and the built-in `actions/setup-node` npm cache.
5. Generate Paraglide i18n files and the Prisma client before running each
   check job.
6. Run quality checks, unit tests, integration tests, and E2E tests as separate
   jobs so they execute in parallel.
7. Split the main Playwright suite by browser using a matrix over Chromium,
   Firefox, and WebKit.
8. Run the organization and authentication Playwright configs as separate
   Chromium-only matrix entries.
9. Upload Playwright reports and test results as per-job artifacts for CI
   debugging.

## Consequences

### Positive

- CI mirrors the documented local quality gate.
- Independent jobs reduce total feedback time.
- Browser-specific Playwright failures are isolated by matrix job.
- Failed E2E runs retain reports, traces, screenshots, and videos when
  Playwright produces them.

### Negative

- Parallel jobs repeat dependency installation and Prisma client generation.
- Playwright browser installation adds runtime cost to each E2E job.
- The workflow does not run for pull requests unless contributors push to
  `main` or `develop`, or manually dispatch it.

### Risks and Mitigations

1. **Workflow drift from local commands:** Keep `CONTRIBUTING.md`,
   `package.json` scripts, and the pinned CI npm version aligned with Docker.
2. **Slow E2E execution:** Run the main browser projects in separate jobs and
   install only the required browser for each job.
3. **Debuggability of CI-only E2E failures:** Upload Playwright report and
   result directories for each matrix entry.

## Related ADRs

| ADR | Relationship |
|-----|-------------|
| 0002 | Implements the deferred Playwright CI pipeline decision |
| 0032 | Uses the same Node.js major version as the Docker deployment |
