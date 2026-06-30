# AGENTS.md

Guidance for AI coding agents (and human contributors) working in this repository.

## Project Overview

Nirvana is an open-source software development workspace (analogue of JetBrains Space / Yandex SourceCraft). The MVP is a Git hosting service with repositories, pull/merge requests, code review, and a REST API — a modular monolith deployable as a single Docker container. Currently at the pre-MVP scaffolding stage.

- **Spec:** `docs/MVP.md` — read this before making architectural changes.
- **Decisions:** `docs/ADR/` — record any new architectural decision as a numbered ADR before implementing it.

## Tech Stack

- **Full-stack framework:** TanStack Start (RC) on Nitro
- **Routing:** TanStack Router, file-based (`src/routes/`)
- **UI:** React 19 + Tailwind CSS v4
- **Build:** Vite 8
- **Lint/format:** Biome 2
- **Tests:** Vitest 4 + Testing Library + jsdom
- **Language:** TypeScript, strict mode, `verbatimModuleSyntax`

## Commands

Run these before considering any task complete:

```bash
npm run check       # Biome lint + format (must pass clean)
npx tsc --noEmit    # Typecheck (strict; must pass with no errors)
npm run test        # Vitest unit tests (must pass)
npm run generate-routes  # Regenerate route tree after adding/removing routes
```

Other useful:
```bash
npm run dev         # Dev server on :3000
npm run build       # Production build → dist/
```

## Code Conventions

- **Formatting:** tabs for indentation, double quotes for strings (enforced by Biome). Do not reformat files outside the Biome `files.includes` set.
- **Files Biome ignores:** `src/routeTree.gen.ts` (generated) and `src/styles.css`.
- **Imports:** use the path aliases `#/*` or `@/*` (both map to `./src/*`). Run "organize imports" on save.
- **No comments** unless explicitly requested by the user.
- **Routing:** file-based — add a new route by creating a file in `src/routes/`; the route tree is auto-generated into `src/routeTree.gen.ts` (never edit by hand).
- **React:** function components, hooks-based; follow the patterns in `src/routes/` and `src/components/`.

## Key Files & Locations

| Path | Purpose |
| --- | --- |
| `docs/MVP.md` | Technical specification — source of truth for requirements |
| `docs/ADR/` | Architecture Decision Records |
| `src/routes/__root.tsx` | Root document shell (HTML, head, header/footer, devtools) |
| `src/routes/` | File-based route definitions |
| `src/router.tsx` | Router factory + router type registration (`declare module`) |
| `src/routeTree.gen.ts` | ⚠ Generated route tree — do not edit |
| `src/components/` | Shared presentational components |
| `src/styles.css` | Global styles + CSS custom-property theme tokens (light/dark) |
| `vite.config.ts` | Vite plugins: devtools, nitro, tailwindcss, tanstackStart, react |
| `biome.json` | Linter/formatter configuration |
| `tsconfig.json` | TypeScript config (strict, `noEmit`, bundler resolution) |

## Architectural Constraints (from the spec)

Respect these when adding features — do not violate them without an ADR:

- **Provider abstractions:** all external dependencies (Git, DB, storage, auth) go through unified interfaces (`GitProvider`, `DatabaseProvider`, `StorageProvider`, `AuthProvider`) with swappable implementations. See `docs/MVP.md` §8.
- **NoAuth mode (MVP):** all actions on behalf of a fixed user. Must be blocked in production (`NODE_ENV=production`) unless `ALLOW_NOAUTH_IN_PRODUCTION=true`. See §5.3 and the final recommendations in `docs/MVP.md`.
- **Modular monolith:** clear boundaries between domain modules (git, auth, repositories, pull-requests). See §7.
- **Single-container deploy:** the whole app runs in one Nitro process; do not introduce a separate server framework. See ADR 0001.
- **Git smart-HTTP protocol:** to be served via a dedicated server route delegating to `GitProvider` (not yet implemented — pending a de-risking spike; see ADR 0001 risks).

## Definition of Done for Code Changes

Before marking a change complete:
1. `npm run check` passes with no errors.
2. `npx tsc --noEmit` passes with no errors.
3. `npm run test` passes (add or update tests for business logic per the spec's TDD requirement, §10).
4. If routes were added/removed, `src/routeTree.gen.ts` is regenerated.
5. No secrets, keys, or credentials committed.

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->
