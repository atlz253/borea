# ADR 0027: Auto-Apply Pending Migrations on Startup

**Status:** Accepted
**Date:** 2026-07-07
**Author:** Architecture Team

## Context

ADR 0025 §152 states: "Run `prisma migrate dev` before `npm run dev` in development."

This manual step creates friction:

1. A fresh checkout followed by `npm install && npm run dev` (the README Quick Start)
   crashes with `SQLITE_ERROR: no such table: main.User` because migrations were
   never applied.
2. The production Docker container (`compose.yaml`) launches `node .output/server/index.mjs`
   without applying migrations, crashing on the first request to any DB-backed
   route.
3. The E2E test suite works around this with `prisma db push` in
   `tests/e2e/global-setup.ts`, but this bypasses the migration history table
   and is not intended for production use.

The single-container deployment model (ADR 0001) expects self-contained startup.
Requiring an out-of-band `db:migrate` or `db:deploy` step violates that principle.

## Decision

Apply pending migrations automatically before the server starts:

1. **`package.json` `dev` script** — runs `prisma migrate deploy` after
   `prisma generate` and before starting the Vite dev server.
   `prisma migrate deploy` is idempotent: it only applies migrations that have
   not yet been recorded in `_prisma_migrations`.

2. **Docker entrypoint** — the production Docker image runs
   `node node_modules/prisma/build/index.js migrate deploy` via an `ENTRYPOINT`
   shell command before launching `node .output/server/index.mjs`.

3. **Runtime image includes Prisma CLI** — the multi-stage Docker build copies
   `node_modules/`, `prisma/` (schema + migrations), and `prisma.config.ts`
   into the runtime stage so that `prisma migrate deploy` can execute without
   the full build toolchain.

4. **`npm start` (standalone production)** — unchanged. Non-Docker production
   deployments are expected to run `npm run db:deploy` as part of their
   deployment pipeline, or use the Docker image which auto-applies.

This supersedes ADR 0025 §152's recommendation of manual migration execution.

## Consequences

### Positive

- Fresh checkout + `npm run dev` works without any manual `db:migrate` step.
- Production Docker container is self-contained: migration runs on every
  container start.
- `prisma migrate deploy` is idempotent (Prisma tracks applied migrations in
  the `_prisma_migrations` table), so restarting the container reapplies only
  new migrations.
- Follows the convention of Rails `db:migrate`, Django `migrate`, and other
  self-contained web frameworks.

### Negative

- Docker runtime image is larger (~640 MB vs ~120 MB previously) because it
  includes the full `node_modules/` tree, including the Prisma CLI and its
  WASM engines. This can be reduced post-MVP by selectively copying only the
  packages required by the Prisma CLI.
- Every `npm run dev` and every container restart runs `prisma migrate deploy`,
  adding ~1-2 seconds to startup time. This is a one-time cost per session on
  the developer machine (subsequent restarts find nothing to apply and exit
  quickly).
- `prisma migrate deploy` requires write access to the Prisma config directory.
  The Docker container runs as the `node` user and the working directory is
  writable, so this is not an issue.

### Risks and Mitigations

1. **Migration rollback on a running container:** `prisma migrate deploy` only
   rolls forward — it never rolls back. A bad migration must be fixed with a
   new migration. This is the standard Prisma workflow and is not affected by
   auto-apply.

2. **Concurrent starts against the same DB:** The MVP is a single-process
   Nitro server. On restart, the old process stops before the new one starts.
   SQLite's file-level locking prevents concurrent writes. No risk.

3. **First start with an empty `data/` volume:** `prisma migrate deploy`
   creates the SQLite file if it does not exist, then applies the full
   migration history. The `ensureFileDatabaseDir` helper (from step 1 of this
   session) already creates the parent directory. First start succeeds.

## Related ADRs

| ADR | Relationship |
|-----|-------------|
| 0025 | §152 superseded — manual `db:migrate` before `dev` is no longer required |
