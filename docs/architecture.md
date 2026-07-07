# Architecture Overview

Borea is a **modular monolith** — a single deployable process with clear separation between domain modules. The full application (frontend, backend, Git HTTP protocol) runs in one Nitro-powered server process, deployable as a single Docker container.

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

## Project Structure

```
src/
  components/             Shared UI components (Header, Footer, Sidebar, AppShell layout)
  modules/                Domain modules — each is a self-contained slice of business logic
    git/                  Git provider, smart-HTTP service, commit/branch operations
    auth/                 File auth provider, NoAuth provider, sessions, user store and UI
    organizations/        Organization model, mode policy, persistence, UI and API
    repositories/         Repository listing, file tree, server functions for the UI
    pull-requests/        Pull/merge requests (scaffold, not yet implemented)
  platform/               Cross-domain infrastructure
    config/               Application configuration (env variables)
    database/             DatabaseProvider interface + PrismaDatabaseProvider (SQLite via Prisma 7)
    logger/               Structured logging
    errors/               Shared error types
  routes/                 File-based routing (TanStack Router)
    api/git/$.tsx         Git smart-HTTP endpoints (clone, push)
    organizations/...     Organization and namespaced repository UI pages
  router.tsx              Router factory + type registration
  theme.ts                Mantine theme (neutral dev-tool palette)
```

## Key Architectural Decisions

All architectural decisions are recorded as ADRs in `docs/ADR/`.

| ADR | Decision |
|-----|----------|
| 0001 | Full-stack framework: TanStack Start (RC) on Nitro |
| 0002 | E2E testing: Playwright |
| 0003 | Project structure: thin routes, module-owned pages, platform/ infra |
| 0004 | UI design system: Mantine v9 |
| 0005 | Application layout: Mantine AppShell (header + sidebar + main) |
| 0006 | GitProvider: system Git CLI via execa |
| 0007 | Git smart-HTTP pull/ clone implementation |
| 0008 | Git smart-HTTP push implementation |
| 0009 | Commit history: GitProvider extension with branches and commits |
| 0018 | Organizations, repository namespaces, and single-organization mode |
| 0019 | File authentication, cookie sessions, and organization ownership |
| 0020 | Equal organization membership and invitations |
| 0021 | Organization and repository role-based access control |

## Architecture Principles

### Provider Abstractions

All external dependencies are accessed through unified interfaces with swappable implementations:

- **GitProvider** — repository operations, commit history, file tree, smart-HTTP streaming
- **DatabaseProvider** — data persistence via SQLite backed by Prisma 7 (`PrismaDatabaseProvider` wraps `PrismaClient` with `@prisma/adapter-libsql`)
- **AuthProvider** — file-backed local authentication or fixed-user NoAuth

### Thin Routes

Route files in `src/routes/` are minimal: they define `createFileRoute`, load data via server functions, and render a page component from `src/modules/<domain>/pages/`. Domain logic stays in modules.

### Git Smart-HTTP

Borea serves the Git smart-HTTP protocol through the `/api/git/<organization>/<repository>.git/` endpoint (see `docs/API.md` for details). Both read (clone/fetch) and write (push) operations are supported. The implementation uses the system Git CLI (`git-upload-pack --stateless-rpc` and `git-receive-pack --stateless-rpc`) via execa, not the CGI-based `git http-backend`.

### Organization Modes

In full authentication mode, `ORGANIZATION_MODE=multi` exposes only
organizations where the current user is a member. Organization roles control
member management, settings, and repository administration. Ordinary members
see only repositories with an explicit `read`, `write`, or `moderator` grant.
`ORGANIZATION_MODE=single` is available only with NoAuth and exposes the
automatically created `default` organization.

### Authentication Modes

`AUTH_MODE=full` is the default and uses file-backed users plus encrypted
cookie sessions. `AUTH_MODE=noauth` performs operations as a fixed user,
bypasses organization membership, and is blocked in production unless
explicitly overridden.

Git smart-HTTP remains public in both modes until repository visibility and Git
credentials are implemented.
