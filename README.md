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
| Build tool           | Vite 8                                                                 |
| Styling              | Tailwind CSS v4 + `@tailwindcss/typography`                            |
| Lint & format        | Biome 2 (tabs, double quotes)                                          |
| Testing              | Vitest 4 + Testing Library + jsdom; Playwright 1 (E2E)                 |
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

## Available Scripts

| Script                    | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start the dev server on port 3000              |
| `npm run build`           | Build for production (outputs to `dist/`)      |
| `npm run preview`         | Preview the production build                   |
| `npm run generate-routes` | Regenerate the TanStack Router route tree      |
| `npm run test`            | Run unit tests (Vitest)                        |
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
├── docs/
│   ├── MVP.md                       # Technical specification
│   └── ADR/                         # Architecture Decision Records
│       └── 0001-fullstack-framework.md
├── public/                          # Static assets (favicon, logos, manifest)
├── src/
│   ├── components/                  # Shared UI components (Header, Footer, …)
│   ├── routes/                      # File-based routes (TanStack Router)
│   │   ├── __root.tsx               # Root layout / document shell
│   │   ├── index.tsx                # Home page
│   │   └── about.tsx                # About page
│   ├── router.tsx                   # Router factory + type registration
│   ├── routeTree.gen.ts             # ⚠ Generated — do not edit
│   └── styles.css                   # Global styles + Tailwind theme tokens
├── tests/
│   └── e2e/                        # Playwright E2E test files
├── biome.json                       # Linter/formatter config
├── playwright.config.ts             # Playwright configuration
├── tsconfig.json                    # TypeScript config (strict, bundler mode)
├── tsr.config.json                  # TanStack Router CLI config
└── vite.config.ts                   # Vite + TanStack Start + Nitro + Tailwind
```

## Documentation

- [Technical Specification (MVP)](docs/MVP.md) — full requirements, architecture, acceptance criteria
- [ADR 0001: Full-Stack TypeScript Framework](docs/ADR/0001-fullstack-framework.md) — why TanStack Start was chosen

## Architecture (summary)

- **Modular monolith** with domain-based modules (git, auth, repositories, pull-requests)
- **Provider abstractions** (GitProvider, DatabaseProvider, StorageProvider, AuthProvider) — all external dependencies accessed through swappable interfaces
- **NoAuth mode** for MVP — all actions performed on behalf of a fixed user; blocked in production unless explicitly enabled
- **REST API** with OpenAPI specification, accessible without authentication in MVP

See the [Technical Specification](docs/MVP.md) and [ADRs](docs/ADR/) for details.

## Roadmap

- **v0.1.0 — MVP:** Git hosting, pull/merge requests, NoAuth mode, REST API, Docker deploy
- **v0.2.0 — Authentication:** auth module, user registration/login, basic access control
- **Future:** issue tracking, wiki, CI/CD integrations, OAuth/LDAP

## License

[MIT](LICENSE)
