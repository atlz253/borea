# Architecture Overview

Nirvana is a **modular monolith** — a single deployable process with clear separation between domain modules. The full application (frontend, backend, Git HTTP protocol) runs in one Nitro-powered server process, deployable as a single Docker container.

## Project Structure

```
src/
  components/             Shared UI components (Header, Footer, Sidebar, AppShell layout)
  modules/                Domain modules — each is a self-contained slice of business logic
    git/                  Git provider, smart-HTTP service, commit/branch operations
    auth/                 AuthProvider interface + NoAuthProvider (MVP)
    organizations/        Organization model, mode policy, persistence, UI and API
    repositories/         Repository listing, file tree, server functions for the UI
    pull-requests/        Pull/merge requests (scaffold, not yet implemented)
  platform/               Cross-domain infrastructure
    config/               Application configuration (env variables)
    database/             DatabaseProvider interface (stub for MVP)
    storage/              StorageProvider interface (stub for MVP)
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

## Architecture Principles

### Provider Abstractions

All external dependencies are accessed through unified interfaces with swappable implementations:

- **GitProvider** — repository operations, commit history, file tree, smart-HTTP streaming
- **DatabaseProvider** — data persistence (stub for MVP, filesystem-based for now)
- **StorageProvider** — file storage (local filesystem for MVP)
- **AuthProvider** — authentication; `NoAuthProvider` is the MVP implementation

### Thin Routes

Route files in `src/routes/` are minimal: they define `createFileRoute`, load data via server functions, and render a page component from `src/modules/<domain>/pages/`. Domain logic stays in modules.

### Git Smart-HTTP

Nirvana serves the Git smart-HTTP protocol through the `/api/git/<organization>/<repository>.git/` endpoint (see `API.md` for details). Both read (clone/fetch) and write (push) operations are supported. The implementation uses the system Git CLI (`git-upload-pack --stateless-rpc` and `git-receive-pack --stateless-rpc`) via execa, not the CGI-based `git http-backend`.

### Organization Modes

`ORGANIZATION_MODE=multi` exposes all organizations and allows creation.
`ORGANIZATION_MODE=single` exposes only the automatically created `default`
organization. Both modes use the same namespaced routes and storage layout.

### NoAuth Mode

The MVP runs without authentication (see `docs/security/noauth-mode.md`). All operations are performed on behalf of a fixed, configurable user. This is blocked in production unless explicitly overridden.
