# Contributing to Borea

Thank you for your interest in contributing! Borea is an open-source software development workspace.

## Development Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes following the code conventions below.
3. Ensure all checks pass (see below).
4. Submit a pull request.

## Required Checks

Before submitting a PR, run these commands and ensure they all pass:

```bash
npm run check          # Biome lint + format (must pass clean)
npx tsc --noEmit       # Typecheck (strict; no errors)
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright E2E tests
npm run generate-routes  # Regenerate route tree if routes were added/removed
```

## Available Scripts

| Script                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start the dev server (applies pending migrations) |
| `npm run build`           | Build for production (outputs to `dist/`)      |
| `npm run preview`         | Preview the production build                   |
| `npm run generate-routes` | Regenerate the TanStack Router route tree      |
| `npm run test`            | Run unit tests (Vitest)                        |
| `npm run test:coverage`   | Run unit tests with coverage report            |
| `npm run test:e2e`        | Run E2E tests (Playwright)                     |
| `npm run test:e2e:ui`     | Run E2E tests in UI mode (Playwright)          |
| `npm run test:e2e:install`| Install Playwright browsers                    |
| `npm run lint`            | Lint with Biome                                |
| `npm run format`          | Format with Biome                              |
| `npm run check`           | Combined Biome check (lint + format)           |
| `npx tsc --noEmit`        | Typecheck (no emit; `tsconfig.json` is strict) |

## Project Structure

```
borea/
├── Dockerfile                      # Multi-stage production image
├── compose.yaml                    # Local single-container deployment
├── CONTRIBUTING.md                 # Contributor guide
├── API.md                          # REST API and Git smart-HTTP reference
├── docs/
│   ├── README.md                   # Documentation index
│   ├── archive/MVP.md             # Technical specification (archived)
│   ├── architecture.md             # Architecture overview
│   ├── deployment.md               # Docker deployment guide
│   ├── git-http.md                 # Clone/push via HTTP (user guide)
│   ├── commit-diff.md              # Commit diff viewing (user guide)
│   ├── code-review.md              # Pull request review progress (user guide)
│   ├── repository-page.md          # Repository UI pages (user guide)
│   ├── security/
│   │   └── noauth-mode.md          # NoAuth mode description and risks
│   └── ADR/                        # Architecture Decision Records
│       └── README.md               # ADR index
├── public/                         # Static assets (favicon, logos, manifest)
├── src/
│   ├── components/                 # Shared UI components (AppShellLayout, Header, Footer, Sidebar)
│   ├── modules/                    # Domain modules
│   │   ├── git/                    # GitProvider, smart-HTTP service, CLI provider
│   │   ├── auth/                   # File authentication, sessions, user store, NoAuth
│   │   ├── repositories/           # Repository listing, file tree, pages, server functions
│   │   └── pull-requests/          # Pull/merge request services, storage, and UI
│   ├── platform/                   # Cross-domain infrastructure
│   │   ├── config/                 # App configuration (env variables)
│   │   ├── database/               # DatabaseProvider interface + Prisma implementation
│   │   ├── logger/                 # Structured logging
│   │   └── errors/                 # Shared error types
│   ├── routes/                     # File-based routes (TanStack Router)
│   │   ├── __root.tsx              # Root layout / document shell
│   │   ├── index.tsx               # Home page (redirects to /repositories)
│   │   ├── repositories.tsx        # Repositories layout
│   │   ├── repositories.index.tsx  # Repositories list
│   │   ├── repositories.$name.tsx  # Repository page layout
│   │   ├── repositories.$name.index.tsx  # Repository page
│   │   ├── repositories.$name.tree.$.tsx  # File tree browser
│   │   ├── repositories.$name.commits.tsx  # Commit history
│   │   ├── repositories.$name.tree.$branch.commits.$sha.tsx  # Commit diff viewer
│   │   └── api/
│   │       ├── git/$.tsx           # Git smart-HTTP endpoints
│   │       └── v1/                 # Versioned REST API routes
│   ├── router.tsx                  # Router factory + type registration
│   ├── routeTree.gen.ts            # ⚠ Generated — do not edit
│   └── theme.ts                    # Mantine theme customization
├── tests/
│   └── e2e/                       # Playwright E2E test files
├── biome.json                      # Linter/formatter config
├── playwright.config.ts            # Playwright configuration
├── tsconfig.json                   # TypeScript config (strict, bundler mode)
├── tsr.config.json                 # TanStack Router CLI config
└── vite.config.ts                  # Vite + TanStack Start + Nitro plugins
```

## Code Conventions

- **Formatting:** tabs for indentation, double quotes for strings (enforced by Biome).
- **No comments** in source code unless explicitly requested by the reviewer.
- **Imports:** use path aliases `#/*` or `@/*` (map to `./src/*`). Run "organize imports" on save.
- **Module boundaries:** cross-module imports must go through the barrel (`index.ts`). Deep imports into internal module subpaths are forbidden (enforced by Biome `style/noRestrictedImports`). See `docs/ADR/0003-project-structure.md`.
- **Routes are thin:** route files in `src/routes/` contain only `createFileRoute`, a loader, and rendering of a page component from `src/modules/<domain>/pages/`. Domain logic belongs in modules.
- **Mantine imports:** import components from `@mantine/core`, hooks from `@mantine/hooks`, code highlighting from `@mantine/code-highlight`.
- **Tests:** follow TDD principles (see `docs/archive/MVP.md` §10). Co-locate unit tests next to source files (`*.test.ts`).

## Architectural Decisions (ADRs)

For any architectural or structural change, create a new ADR in `docs/ADR/` before implementing. Each ADR file follows the naming convention `00NN-title-in-kebab-case.md` and should cover:

- **Context** — why the decision is needed
- **Alternatives Considered** — what else was evaluated
- **Decision** — what was chosen
- **Consequences** — positive and negative outcomes

See existing ADRs in `docs/ADR/` for examples.

## Documentation

New features and user-facing changes must be documented:
- Architectural decisions go in `docs/ADR/`.
- Feature documentation goes in `docs/`.
- Update `README.md` if the stack, structure, or commands change.
- Update `API.md` if endpoints are added or changed.
- Update `docs/repository-page.md` if repository UI pages are extended.
- Update `docs/ADR/README.md` when adding a new ADR.

## Security

- No secrets, keys, or credentials in commits.
- NoAuth mode (MVP) must not be accidentally enabled in production. See `docs/security/noauth-mode.md`.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](LICENSE)).
