# Nirvana

> Open-source software development workspace that unifies development tools in a single space — an analogue of JetBrains Space and Yandex SourceCraft.

Nirvana is a platform project, built as a modular monolith with provider-based abstractions. The MVP delivers a Git hosting service with repositories, pull/merge requests, code review, and a REST API — deployable as a single Docker container.

**Status:** Pre-MVP (active scaffolding). Not production-ready.

## Tech Stack

| Area                 | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Full-stack framework | [TanStack Start](https://tanstack.com/start) (RC) on Nitro             |
| Routing              | [TanStack Router](https://tanstack.com/router) — file-based, type-safe |
| UI runtime           | React 19                                                               |
| UI components        | [Mantine](https://mantine.dev) v9 (`@mantine/core`, `@mantine/hooks`, `@mantine/code-highlight`) |
| Icons                | [lucide-react](https://lucide.dev)                                     |
| Build tool           | Vite 8                                                                 |
| Styling              | Mantine CSS layers + CSS variables (no Tailwind)                       |
| Validation           | [Zod](https://zod.dev) v4                                              |
| Lint & format        | Biome 2 (tabs, double quotes)                                          |
| Testing              | Vitest 4 + Testing Library + jsdom; Playwright 1 (E2E)                 |
| Git operations       | System Git CLI via [execa](https://github.com/sindresorhus/execa)      |
| Package manager      | npm                                                                    |
| Language             | TypeScript (strict)                                                    |

## Quick Start

```bash
npm install
npm run dev      # http://localhost:3000
```

### Prerequisites

- Node.js (LTS recommended)
- npm
- Git (for repository operations)

## Available Scripts

| Script                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start the dev server on port 3000              |
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

## Production Deploy

The build outputs a self-contained Nitro Node server:

```bash
npm run build
node dist/server/index.mjs
```

For host-specific Nitro presets (Vercel, Netlify, Cloudflare, AWS Lambda, etc.), see <https://v3.nitro.build/deploy>.

## Project Structure

```
nirvana/
├── CONTRIBUTING.md                 # Contributor guide
├── API.md                          # REST API and Git smart-HTTP reference
├── docs/
│   ├── README.md                   # Documentation index
│   ├── MVP.md                      # Technical specification
│   ├── architecture.md             # Architecture overview
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
│   │   ├── auth/                   # AuthProvider interface + NoAuthProvider
│   │   ├── repositories/           # Repository listing, file tree, pages, server functions
│   │   └── pull-requests/          # Pull/merge request services, storage, and UI
│   ├── platform/                   # Cross-domain infrastructure
│   │   ├── config/                 # App configuration (env variables)
│   │   ├── database/               # DatabaseProvider interface (stub)
│   │   ├── storage/                # StorageProvider interface (stub)
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

## Documentation

- [Documentation Index](docs/README.md) — overview of all documentation
- [Technical Specification (MVP)](docs/MVP.md) — full requirements, architecture, acceptance criteria
- [Architecture Overview](docs/architecture.md) — project structure, modules, providers
- [Working with Repositories via HTTP](docs/git-http.md) — how to clone and push
- [Using Repository Pages](docs/repository-page.md) — how to browse files and commits
- [Pull Request Code Review](docs/code-review.md) — how to mark changed files as viewed
- [API Reference](API.md) — REST API v1 and Git smart-HTTP endpoints
- [NoAuth Mode](docs/security/noauth-mode.md) — development-mode authentication
- [Contributing Guide](CONTRIBUTING.md) — how to contribute

### Architecture Decision Records

All ADRs are listed in the [ADR index](docs/ADR/README.md):

| ADR | Title |
|-----|-------|
| 0001 | Full-Stack TypeScript Framework (TanStack Start) |
| 0002 | E2E Testing Tool (Playwright) |
| 0003 | Project Directory Structure |
| 0004 | UI Design System (Mantine) |
| 0005 | Application Layout (Mantine AppShell) |
| 0006 | GitProvider Implementation (Git CLI via execa) |
| 0007 | Git Smart-HTTP Pull |
| 0008 | Git Smart-HTTP Push |
| 0009 | Commit History |
| 0017 | REST API v1 |

## Architecture (summary)

- **Modular monolith** with domain-based modules (git, auth, repositories, pull-requests)
- **Provider abstractions** (GitProvider, DatabaseProvider, StorageProvider, AuthProvider) — all external dependencies accessed through swappable interfaces
- **Thin routes** — route files delegate to page components in module folders
- **Mantine AppShell layout** — consistent GitHub-like UI with header, sidebar, and end-of-content footer
- **Git smart-HTTP** — HTTP clone and push through `/api/git/<name>.git/` (pull ✅, push ✅)
- **File tree browsing** — navigate repository files with breadcrumbs and directory listing (✅)
- **Commit history** — table view of commits with branch context (✅)
- **Pull request review progress** — persistent Viewed marks collapse reviewed file diffs (✅)
- **NoAuth mode** for MVP — all actions performed on behalf of a fixed user; blocked in production unless explicitly enabled
- **REST API v1** — repository and pull request operations with OpenAPI 3.1 (✅)

See the [Technical Specification](docs/MVP.md) and [ADRs](docs/ADR/README.md) for details.

## Roadmap

- **v0.1.0 — MVP:**
  - ✅ Git hosting — repository creation, file tree browsing, commit history
  - ✅ Smart-HTTP pull (clone/fetch) and push
  - 🟨 Pull/Merge requests with code review (viewed-file tracking implemented)
  - ✅ REST API v1 with OpenAPI 3.1
  - 🔲 Docker deployment
  - 🔲 Complete documentation (in progress)
- **v0.2.0 — Authentication:** auth module, user registration/login, basic access control
- **Future:** issue tracking, wiki, CI/CD integrations, OAuth/LDAP

## License

[MIT](LICENSE)
