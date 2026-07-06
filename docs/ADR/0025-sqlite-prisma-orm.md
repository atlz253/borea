# ADR 0025: SQLite + Prisma 7 ORM

**Status:** Accepted
**Date:** 2026-07-06
**Author:** Architecture Team

## Context

The Technical Specification (§8.2) defines `DatabaseProvider` as the unified interface for DB operations, abstracted from a specific ORM. §15 leaves questions #1 (DBMS) and #4 (ORM) open.

At MVP scaffolding stage, data is stored in JSON files:

- Users and Git tokens — `USERS_PATH` (`./data/users/`)
- Organizations, memberships, repository access, repository grants — `ORGANIZATIONS_PATH` (`./data/organizations/`)
- Pull requests, comments, viewed files — `PULL_REQUESTS_PATH` (`./data/pull-requests/`)
- Repository metadata (description, createdAt) — derived from filesystem bare-repository scan (see ADR 0006)

This file-based approach was intentional for the initial scaffolding (ADRs 0006, 0012, 0019, 0020). All three deferred a proper DatabaseProvider to a future ADR.

### Problems with the file-based approach

1. **Linear scans** — `getUserById`, `listGitTokens`, `listRepositoryAccess` iterate all files in a directory. Degrades with scale.
2. **No referential integrity** — deleting an organization requires manual cascade removal of members, repository access, and PR data. Race conditions if a crash occurs mid-cascade.
3. **No atomic multi-file operations** — `transferOwnership` touches three files with no rollback on partial failure.
4. **Concurrency** — per-PR write locks are in-process only. Multiple processes (future scale) are unprotected.
5. **Maintenance burden** — each store implements mkdir, readdir, atomic-write (tmp+rename), path-traversal guards. ~1600 lines of filesystem code.

### Prerequisites

- `DATABASE_URL` is listed in `docs/MVP.md` §12.2 as a reserved environment variable.
- ADR 0006 explicitly deferred the database decision: "When `DatabaseProvider` is implemented (future ADR), should `Repository` metadata be migrated from FS to DB? Decision deferred."
- ADR 0012 considered SQLite via `DatabaseProvider` but rejected it for the initial PR slice: "requires choosing a DBMS and ORM (§15 #1, #4) and a real `DatabaseProvider` implementation — a large separate ADR."

## Alternatives Considered

### 1. DBMS: PostgreSQL vs SQLite

**SQLite (chosen):**

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Deployment | Single file, no separate server process | Requires dedicated server/container |
| Docker | No second container needed; data stays in `/app/data` volume | Needs a postgres container in compose.yaml |
| Backup | `cp nirvana.db` | `pg_dump` |
| MVP fit | R/W concurrency sufficient for single-process Nitro server | Overkill for MVP with ~single user |
| Migration complexity | Prisma supports both, easy to migrate later if needed | Higher upfront ops cost |

SQLite is the simplest choice for a pre-MVP modular monolith deployable as a single container. The store interfaces already provide the abstraction: migrating to PostgreSQL later means creating new Prisma store implementations behind the same `UserStore`/`OrganizationStore`/`PullRequestStore` interfaces.

### 2. ORM: Prisma 7 (JS drivers) vs Prisma 6 (native binary) vs Drizzle vs Kysely

**Prisma 7 with JS drivers (chosen):**

| Aspect | Prisma 7 (prisma-client) | Prisma 6 (prisma-client-js) |
|--------|--------------------------|------------------------------|
| Engine | Pure JS — no native binary | Native Rust binary per platform |
| Docker bundling | Just `npm install` | Requires `binaryTargets = ["linux-musl-debian"]` |
| Schema/Client mismatch | Catches schema drift on every query | Same |
| Maturity | New (2025) | Stable (since 2019) |
| SQLite driver | `@prisma/adapter-libsql` / `@prisma/adapter-better-sqlite3` | Built-in support |

Prisma 7 eliminates the biggest deployment friction point — native binary targets for Docker. With JS drivers, `npm install` and `npx prisma generate` are sufficient; no need to cross-compile for `linux-musl` or worry about `glibc` versions.

**Drizzle ORM** was considered but rejected because:
- No generated client — type-safety depends on TypeScript inference on raw SQL queries
- Smaller driver adapter ecosystem for SQLite at this time
- Store interfaces already abstract the ORM; migration cost to Prisma is worth the developer experience

**Kysely** (type-safe SQL query builder) was rejected: too low-level, no migration tooling, no generated client.

### 3. DatabaseProvider design

Options:

**a) DatabaseProvider as thin PrismaClient wrapper (chosen):**
`DatabaseProvider` interface exposes `getClient(): PrismaClient` and `transaction<T>(fn): Promise<T>`. Stores depend on this interface, not on Prisma directly. If Prisma is replaced, only `PrismaDatabaseProvider` and the store implementations change — the interface stays.

```typescript
export interface DatabaseProvider {
	getClient(): PrismaClient;
	transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
}
```

**b) Direct PrismaClient in stores:** Rejected — violates §8.2 (abstracted from a specific ORM).

**c) Full abstraction with entity-specific repos:** Rejected — overengineered for MVP. The store interfaces already provide entity-level abstraction. DatabaseProvider only needs to expose the client and a transaction primitive.

### 4. PR numbering: global autoincrement vs per-repo numbering

Current semantics: each repository has independent PR numbers (#1, #2, …). URLs use `/pulls/1`.

**Per-repo composite key `@@id([repositoryId, prNumber])` (chosen):**
- Backward compatible with existing URLs
- PR number computed atomically in a transaction (`SELECT MAX(prNumber)+1 WHERE repositoryId = X`)
- Per-repo counter table or in-transaction MAX + 1

**Global autoincrement:** Rejected — would break all PR URLs that assume per-repo numbering.

### 5. Repository metadata: filesystem-derived vs database

**Database (chosen):**
- New `Repository` table stores `{ id, organizationName, name, description, createdAt, ownerId }`
- `CliGitProvider.init()` creates bare-repo on FS; the caller creates the DB row
- `CliGitProvider.list()` no longer scans FS — delegates to store
- `readRepositoryInfo()` in `cli-git-repository.ts` is removed

This supersedes ADR 0006 decision.2 ("filesystem scan, no database") and resolves its open question.

## Decision

1. **DBMS:** SQLite
2. **ORM:** Prisma 7 with JS driver adapter (`@prisma/adapter-libsql`)
3. **DatabaseProvider interface:** thin wrapper over PrismaClient, injected into stores
4. **PR numbering:** per-repo composite key, computed atomically in transactions
5. **Repository metadata:** stored in `Repository` table
6. **Store interfaces** (`UserStore`, `GitTokenStore`, `OrganizationStore`, `PullRequestStore`) — remain the abstraction layer. The underlying implementations switch from FileSystem to Prisma.
7. **Sessions** — unchanged (signed cookies, no DB).

## Consequences

### Positive

- All entity lookups become indexed queries — no more linear directory scans
- Referential integrity via FK constraints + cascade deletes
- Atomic multi-table operations via transactions (`transferOwnership`, repo creation)
- Prisma 7 JS drivers eliminate native binary dependency from Docker builds
- Store interfaces remain ORM-agnostic — migration to PostgreSQL later means new store implementations
- ~1600 lines of filesystem boilerplate removed
- `Repository` metadata is now queryable and relational (future: count repos by user, search by name, etc.)

### Negative

- Prisma 7 is newer with a smaller ecosystem; driver adapter maturity should be validated
- Prisma `prisma-client` generator output must be excluded from Biome linting
- Existing `.env` variables (`USERS_PATH`, `ORGANIZATIONS_PATH`, `PULL_REQUESTS_PATH`) become obsolete — replaced by `DATABASE_URL`
- File-based data in `data/` directories is no longer read — existing installations need a migration script
- Need to ensure Nitro/Vite bundling handles Prisma Client imports correctly

### Risks and Mitigations

1. **Prisma 7 + Nitro bundling compatibility**
   _Mitigation:_ Verify `npm run build` produces a working `.output/server/index.mjs`. Prisma 7 with `runtime = "nodejs"` uses standard ESM imports that bundlers understand.

2. **SQLite concurrent write contention**
   _Mitigation:_ Single Nitro process for MVP. SQLite WAL mode allows concurrent reads. Writes are serialized by the database (no in-process mutexes needed).

3. **Migration of existing file data**
   _Mitigation:_ This is a pre-MVP change — no production data exists. A migration script can be written later if needed. The `data/` directory is in `.gitignore`.

4. **Prisma schema drift in development**
   _Mitigation:_ `prisma migrate dev` re-generates the client on every schema change. Add `db:migrate` npm script. Run before `npm run dev` in development.

5. **Loss of birthtime-based createdAt**
   _Mitigation:_ `Repository.createdAt` is now set explicitly at creation time in the DB, not derived from `fs.stat.birthtime`. New repositories will have accurate timestamps. Existing repos (if any) would need their timestamps migrated.

## Supersedes

| ADR | Section Superseded |
|-----|-------------------|
| 0006 | §Decision.2 — "filesystem scan, no database for MVP" |
| 0012 | §Decision.1 — "JSON file store for PR metadata" |
| 0019 | §Storage layout — file-backed organizations and users |
| 0020 | §Storage layout — file-backed memberships |
