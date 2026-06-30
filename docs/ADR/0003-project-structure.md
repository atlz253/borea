# ADR 0003: Project Directory Structure

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The Technical Specification (§7) defines the architecture as a "modular monolith with clear separation into domain-based modules" and lists the canonical modules: `git`, `auth`, `repositories`, `pull-requests` (§7.3). The spec §15 leaves open-question #15.5 ("Monorepo structure") unresolved — this ADR closes it for the single-package structure.

The project uses TanStack Start (ADR 0001), which enforces file-based routing in `src/routes/` for both UI pages and API server routes. This constrains how routes can be organized: they must live in `src/routes/` and cannot be relocated to module folders.

Additionally, module boundary enforcement is needed to prevent tight coupling between domains. Biome (ADR 0000 — chosen stack) provides the `style/noRestrictedImports` lint rule with gitignore-style pattern matching since v2.2.0, which can be used to forbid deep imports across module boundaries.

Key questions resolved by this ADR:
1. Where to place domain modules (naming, location)
2. How to organize routes (thin routes delegating to module-owned pages)
3. Where to place cross-domain infrastructure (DatabaseProvider, StorageProvider, config, logger, errors)
4. How to enforce module boundaries (Biome `noRestrictedImports`)

## Alternatives Considered

### 1. Module folder naming: `modules/` vs `domains/` vs `features/`

- **`modules/`** — matches spec wording ("modular monolith", "modules"). Familiar term in modular-monolith literature.
- **`domains/`** — DDD terminology, would resonate with the spec's "domain-based modules".
- **`features/`** — common in feature-sliced React projects, but less precise for backend domain modules.

### 2. Routes strategy: thin routes + module-owned pages vs routes-as-pages

- **Thin routes + pages in modules** — Three tiers: (1) `src/routes/` files contain only `createFileRoute`, loader, and rendering of an imported page component; (2) `src/modules/<domain>/pages/` hold the React page components; (3) `src/modules/<domain>/` holds everything else (services, schemas, components, server functions).
- **Routes-as-pages, grouped by domain** — Route files are the page components and live in `src/routes/<domain>/`; only services/schemas live in module folders. More idiomatic for TanStack Router but blurs domain boundaries.
- **Hybrid (routes re-export from modules)** — Route components in `src/modules/<domain>/routes/`, `src/routes/` just re-exports them. Maximum cohesion but two places per route.

### 3. Infrastructure location: `platform/` vs `shared/` vs separate domain modules

- **`platform/` module** — DatabaseProvider, StorageProvider, config, logger, errors live together as a dedicated infrastructure concern. Clear separation: domain logic ↔ infrastructure.
- **`shared/` flat folder** — All cross-cutting code in one bag, mixing DB, storage, config, and utilities.
- **Separate domain modules for infra** — Treating `database` and `storage` as peer modules of `git` and `auth`. Inconsistent with their infrastructure nature.

### 4. Module boundary enforcement: Biome vs ESLint vs dependency-cruiser

- **Biome `style/noRestrictedImports` with `patterns`** — native to the existing linter, no new tooling. Gitignore-style patterns since v2.2.0 (we have 2.4.5). Covers alias-based deep imports (`#/modules/*/**`) and relative path patterns (`**/modules/*/**`). Gap: relative cross-module imports without literal `modules` are not caught.
- **ESLint `import/no-restricted-paths`** — more powerful path restriction with `zones` but requires maintaining a separate ESLint config alongside Biome. Not worth the complexity at MVP stage.
- **Dependency-cruiser** — the most thorough boundary enforcement with visual dependency graphs, but separate tool, separate CI step. Defers to post-MVP.

## Decision

### a) Directory structure

```
src/
  modules/{git,auth,repositories,pull-requests}/
  platform/{database,storage,config,logger,errors}/
  routes/                 — file-based router (thin)
  components/             — shared presentational UI
  shared/                 — cross-domain non-infra utilities (optional)
```

### b) Naming: `src/modules/` for domain modules

### c) Routes: thin route files in `src/routes/` delegate to module-owned pages in `src/modules/<domain>/pages/`

### d) Infrastructure: `src/platform/` — a dedicated module for cross-cutting infrastructure concerns

Each subdirectory within `platform/` is a public sub-barrel (importable as `#/platform/database`, `#/platform/logger`, etc.). No deep-internal imports beyond sub-barrels are enforced at this stage (future Biome pattern could be added).

### e) Module boundary enforcement: Biome `style/noRestrictedImports`

```json
{
  "linter": {
    "rules": {
      "style": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "patterns": [
              {
                "group": [
                  "#/modules/*/**",
                  "@/modules/*/**",
                  "**/modules/*/**"
                ],
                "message": "Deep imports into domain modules are forbidden. Import only from the module barrel: #/modules/<name>."
              }
            ]
          }
        }
      }
    }
  },
  "overrides": [
    {
      "include": [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/tests/e2e/**"
      ],
      "linter": {
        "rules": {
          "style": { "noRestrictedImports": "off" }
        }
      }
    }
  ]
}
```

Test files are exempted because they need direct access to module internals.

### f) Module internal layout convention

Each domain module follows this structure:

```
modules/<domain>/
  index.ts              public API (barrel) — only re-exports intended external surface
  schemas.ts            zod schemas (validation + OpenAPI source)
  *.service.ts          use cases / application logic
  *.repository.ts       data access (via DatabaseProvider)
  providers/            concrete implementations of domain interfaces
  server/
    *.functions.ts      createServerFn wrappers (called from client)
    *.server.ts         server-only helpers (DB queries, etc.)
  components/           domain-specific React components
  pages/                full page components (rendered by thin routes)
  *.test.ts             co-located unit tests
```

### g) Server route placement

REST API endpoints and Git HTTP are defined as TanStack Start server routes in `src/routes/api/`. They are thin: they parse request, delegate to a module service, format response.

Server functions (`createServerFn`) live inside the owning module's `server/` subfolder and are NOT file-routed.

## Consequences

### Positive

- **Modular monolith** — each module is a self-contained directory with its own public API (`index.ts`). Cross-module dependencies are explicit and auditable.
- **Framework alignment** — TanStack Start's file routing constraint (`src/routes/` is the only valid route directory) is respected while keeping domain logic inside modules.
- **Gradual adoption** — existing scaffold (`src/components/`, `src/routes/{__root,about,index}.tsx`) is unaffected. New code goes into the new structure.
- **Boundary enforcement** — `noRestrictedImports` catches deep alias imports at lint time with a clear message. Developers get immediate feedback when crossing module boundaries incorrectly.
- **No new tooling** — the lint rule uses the existing Biome setup. No ESLint, no dependency-cruiser.
- **Infrastructure separation** — `platform/` clearly separates cross-cutting concerns (DB, storage, config, logger) from domain logic.
- **Tests co-located** — consistent with existing pattern (`ThemeToggle.test.tsx` next to `ThemeToggle.tsx`). Vitest config already covers `src/**/*.{test,spec}`.

### Negative

- **Two locations per UI page** — one thin route in `src/routes/` + one page component in `modules/<domain>/pages/`. Slightly more navigation than routes-as-pages.
- **Pattern not enforced on relative imports** — `../git/providers/x` from a sibling module (without literal `modules`) is not caught. This is an accepted gap; alias imports (`#/modules/git`) are the intended convention.
- **Platform sub-barrels permissive** — `#/platform/database/providers/specific` is not restricted. A future Biome pattern could be added if needed.
- **Route tree not generated for API routes** — `tsr generate` only affects UI routes. API routes in `src/routes/api/` are manually defined server routes; no auto-generation. This is consistent with TanStack Start's design.

### Risks and Mitigations

1. **Biome `noRestrictedImports` config syntax**
   _Mitigation:_ Schema-validate at implementation time using the `$schema` URL in `biome.json`. Run `npm run check` immediately after config change.

2. **Override field name mismatch**
   `overrides[].include` may be `includes` in Biome 2.x. Verified at implementation time against the 2.4.5 JSON schema.

## Open Questions

- Is `src/shared/` needed at MVP or only when a cross-cutting non-infra utility emerges? Deferred to implementation.
