# AGENTS.md

Guidance for AI coding agents (and human contributors) working in this repository.

## Project Overview

Nirvana is an open-source software development workspace (analogue of JetBrains Space / Yandex SourceCraft). The MVP is a Git hosting service with repositories, pull/merge requests, code review, and a REST API — a modular monolith deployable as a single Docker container. Currently at the pre-MVP scaffolding stage.

- **Spec:** `docs/MVP.md` — read this before making architectural changes.
- **Decisions:** `docs/ADR/README.md` — index of all ADRs (0001–0019). Record any new architectural decision as a numbered ADR before implementing it.

## Tech Stack

- **Full-stack framework:** TanStack Start (RC) on Nitro
- **Routing:** TanStack Router, file-based (`src/routes/`)
- **UI:** React 19 + Mantine v9
- **Icons:** lucide-react
- **Build:** Vite 8
- **Styling:** Mantine (CSS layers, style props, CSS variables) — no Tailwind
- **Lint/format:** Biome 2
- **Tests:** Vitest 4 + Testing Library + jsdom; E2E via Playwright 1 (`tests/e2e/`, `playwright.config.ts`)
- **Git operations:** system Git CLI via execa
- **Validation:** Zod v4
- **OpenAPI:** `@asteasolutions/zod-to-openapi`, OpenAPI 3.1
- **Language:** TypeScript, strict mode, `verbatimModuleSyntax`

## Commands

Run these before considering any task complete:

```bash
npm run check       # Biome lint + format (must pass clean)
npx tsc --noEmit    # Typecheck (strict; must pass with no errors)
npm run test        # Vitest unit tests (must pass)
npm run generate-routes  # Regenerate route tree after adding/removing routes
npm run test:e2e    # Playwright E2E tests (must pass)
npm run test:e2e:ui # Playwright E2E in UI mode
```

Other useful:
```bash
npm run dev         # Dev server on :3000
npm run build       # Production build → dist/
npm run test:coverage  # Unit tests with coverage report
npm run lint        # Biome lint
npm run format      # Biome format
npm run typecheck   # TypeScript type checking
```

## Code Conventions

- **Formatting:** tabs for indentation, double quotes for strings (enforced by Biome). Do not reformat files outside the Biome `files.includes` set.
- **Files Biome ignores:** `src/routeTree.gen.ts` (generated).
- **Imports:** use the path aliases `#/*` or `@/*` (both map to `./src/*`). Run "organize imports" on save.
- **Module boundaries:** cross-module imports must go through the barrel (`index.ts`). Deep imports into internal module subpaths are forbidden by Biome `style/noRestrictedImports`. See ADR 0003.
- **Biome linter rules:** additional non-recommended rules enforced:
  - `noExcessiveLinesPerFile` — prod ≤600 lines, tests ≤850 lines
  - `noExcessiveCognitiveComplexity` — functions complexity ≤15
  - `noFloatingPromises` — all promises must be awaited, void-ed, or caught
  - `noConsole` — use `#/platform/logger` instead (warn in tests)
  - `useExhaustiveDependencies` — React hook deps must be complete
  - `noConfusingVoidType` — `void` only in return/type param positions
  - `noEmptyInterface` — empty interfaces are forbidden
- **Mantine imports:** import Mantine components from `@mantine/core`, hooks from `@mantine/hooks`, code highlighting from `@mantine/code-highlight`. Import Mantine CSS via side-effect: `import '@mantine/core/styles.css'` in root layout.
- **No comments** unless explicitly requested by the user.
- **Routing:** file-based — add a new route by creating a file in `src/routes/`; the route tree is auto-generated into `src/routeTree.gen.ts` (never edit by hand).
- **Routes are thin:** route files in `src/routes/` should only contain `createFileRoute`, a loader, and rendering of a page component imported from `src/modules/<domain>/pages/`. Domain logic belongs in modules, not routes.
- **React:** function components, hooks-based; follow the patterns in `src/routes/` and `src/components/`.

## Key Files & Locations

| Path | Purpose |
| --- | --- |
| `docs/MVP.md` | Technical specification — source of truth for requirements |
| `docs/ADR/` | Architecture Decision Records |
| `docs/ADR/README.md` | ADR index (0001–0019) |
| `docs/security/authentication.md` | Full authentication, sessions, and ownership documentation |
| `docs/architecture.md` | Architecture overview for developers |
| `docs/deployment.md` | Production Docker image and Compose deployment guide |
| `docs/git-http.md` | User guide for clone/push over HTTP |
| `docs/repository-page.md` | User guide for repository UI pages |
| `docs/commit-diff.md` | User guide for commit diff viewing |
| `docs/security/noauth-mode.md` | NoAuth mode documentation |
| `CONTRIBUTING.md` | Contributor guide |
| `API.md` | REST API v1 and Git smart-HTTP reference |
| `src/routes/__root.tsx` | Root document shell (HTML, head, header/footer, devtools) |
| `src/routes/` | File-based route definitions |
| `src/router.tsx` | Router factory + router type registration (`declare module`) |
| `src/routeTree.gen.ts` | ⚠ Generated route tree — do not edit |
| `tests/e2e/` | Playwright E2E test files |
| `playwright.config.ts` | Playwright configuration |
| `src/modules/` | Domain modules (git, auth, organizations, repositories, pull-requests) |
| `src/modules/auth/` | AuthProvider implementations, user store, sessions, schemas, UI and API |
| `src/modules/pull-requests/` | PR module: `schemas.ts`, `pull-request.store.ts`, `pull-request.service.ts`, `server/pull-request.functions.ts`, `components/`, `pages/` |
| `src/routes/repositories.$name.tree.$branch.commits.$sha.tsx` | Route for commit diff viewing |
| `src/modules/repositories/pages/CommitDiffPage.tsx` | Commit diff detail page |
| `src/components/SplitDiffView.tsx` | Side-by-side diff viewer component (shared) |
| `src/routes/repositories.$name.pulls.$pullId.tsx` | PR detail layout (Conversation / Files changed tabs) |
| `src/routes/repositories.$name.pulls.$pullId.index.tsx` | PR Conversation tab (detail + merge controls) |
| `src/routes/repositories.$name.pulls.$pullId.files.tsx` | PR Files changed tab (diff view) |
| `src/platform/` | Cross-domain infrastructure (db, storage, config, logger, errors) |
| `src/platform/config/` | AppConfig for storage, Git, auth mode, user path, session secret, and organization mode |
| `src/routes/api/` | Server routes for REST API and Git HTTP — delegates to module services |
| `src/routes/api/v1/` | Versioned repository and pull request REST API routes |
| `src/components/` | Shared presentational components |
| `src/theme.ts` | Mantine theme customization (default: neutral dev-tool palette) |
| `vite.config.ts` | Vite plugins: devtools, nitro, tanstackStart, react |
| `Dockerfile` | Multi-stage production image with Nitro output and Git CLI |
| `compose.yaml` | Single-container deployment with persistent application data |
| `biome.json` | Linter/formatter configuration |
| `tsconfig.json` | TypeScript config (strict, `noEmit`, bundler resolution) |

## Architectural Constraints (from the spec)

Respect these when adding features — do not violate them without an ADR:

- **Provider abstractions:** all external dependencies (Git, DB, storage, auth) go through unified interfaces (`GitProvider`, `DatabaseProvider`, `StorageProvider`, `AuthProvider`) with swappable implementations. See `docs/MVP.md` §8.
- **NoAuth mode (MVP):** all actions on behalf of a fixed user. Must be blocked in production (`NODE_ENV=production`) unless `ALLOW_NOAUTH_IN_PRODUCTION=true`. See §5.3 and the final recommendations in `docs/MVP.md`.
- **Modular monolith:** clear boundaries between domain modules (git, auth, repositories, pull-requests). See §7.
- **Single-container deploy:** the whole app runs in one Nitro process; do not introduce a separate server framework. See ADR 0001.
- **Git smart-HTTP protocol:** served via `/api/git/<name>.git/` endpoints delegating to `GitProvider`. See ADR 0007 and ADR 0008.

## Documentation

Every new feature or architectural change must be documented. Follow these rules:

- **Architectural changes** — create a new ADR in `docs/ADR/` before implementing. Update `docs/ADR/README.md` with the new entry.
- **New features** — if the change affects architecture, create an ADR. If it is a user-facing feature, add or update a document in `docs/` (e.g., `docs/git-http.md`, `docs/repository-page.md`).
- **Stack/structure changes** — update `README.md` and `AGENTS.md`.
- **API changes** — update `API.md` when endpoints are added or modified.
- **Check links** — verify all cross-document references before committing.

## Definition of Done for Code Changes

Before marking a change complete:
1. **Integration/E2E tests are written** for the feature or change — placed in `tests/e2e/`. A task is not considered done without automated browser-level coverage of the user-facing behaviour.
2. `npm run check` passes with no errors.
3. `npx tsc --noEmit` passes with no errors.
4. `npm run test` passes (add or update unit tests per the spec's TDD requirement, §10).
5. Integration/E2E tests covering the affected logic pass (run the relevant targeted Playwright tests; the full `npm run test:e2e` suite is not required).
6. If routes were added/removed, `src/routeTree.gen.ts` is regenerated.
7. **Documentation is updated** — ADR for architectural changes; section in `docs/` for new features; `README.md`/`AGENTS.md` for stack/structure changes; `API.md` for new endpoints.
8. No secrets, keys, or credentials committed.

<!-- mantine -->
Use Mantine MCP (`list_items`, `get_item_doc`, `get_item_props`, `search_docs`) for Mantine-specific questions: component props, theming API, available components, usage examples. Prefer this over Context7 for Mantine queries — it draws from the authoritative `mantine.dev` source.

For all other libraries (TanStack, Vitest, Playwright, etc.), use Context7.
<!-- mantine -->

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->
