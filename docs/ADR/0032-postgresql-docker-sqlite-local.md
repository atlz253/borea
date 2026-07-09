# ADR 0032: PostgreSQL Docker Deployment With SQLite Local Development

**Status:** Accepted
**Date:** 2026-07-09
**Author:** Architecture Team

## Context

ADR 0025 selected SQLite with Prisma 7 because it kept the pre-MVP deployment
simple and required no separate database service. That remains useful for
local non-Docker development: `npm run dev` should work from a fresh checkout
without requiring PostgreSQL.

Docker deployment has different needs. A production-like container stack should
run metadata on PostgreSQL while keeping Git repositories on filesystem
storage. Prisma migrations are provider-specific, and Prisma 7 JS driver
adapters require a provider-matching generated client.

## Decision

1. SQLite remains the default local non-Docker database. The default Prisma
   schema stays at `prisma/schema.prisma`, with migrations in
   `prisma/migrations`.
2. Docker PostgreSQL deployment uses `docker/compose.postgres.yaml` as an
   override. It adds a `postgres` service and configures the app with a
   `postgresql://` `DATABASE_URL`.
3. PostgreSQL has its own Prisma schema and migration path:
   `prisma/postgres/schema.prisma` and `prisma/postgres/migrations`.
4. `prisma.config.ts` reads `PRISMA_SCHEMA` and `PRISMA_MIGRATIONS_PATH`, so
   build and runtime commands can select the database provider explicitly.
5. `PrismaDatabaseProvider` selects the runtime adapter from `DATABASE_URL`:
   `file:`, `:memory:`, and `libsql://` use `@prisma/adapter-libsql`;
   `postgres://` and `postgresql://` use `@prisma/adapter-pg`.
6. No SQLite-to-PostgreSQL data conversion is provided. Existing SQLite metadata
   remains separate from PostgreSQL deployments.

## Consequences

### Positive

- Local development keeps the no-PostgreSQL startup path.
- Docker deployment can use a production-grade PostgreSQL database.
- The database choice is explicit in environment and build configuration.
- Git repository storage remains unchanged in `/app/data/repositories`.

### Negative

- Prisma schema and migration history are duplicated for SQLite and
  PostgreSQL.
- Schema changes must update both migration paths until the project chooses a
  single database provider.
- A Docker PostgreSQL image must be rebuilt when switching the Prisma provider,
  because the generated Prisma client is provider-specific.

### Risks and Mitigations

1. **Schema drift between providers:** Update both Prisma schemas and migration
   paths in the same pull request for metadata model changes.
2. **Accidental PostgreSQL runtime with SQLite client:** Docker passes
   `PRISMA_SCHEMA=prisma/postgres/schema.prisma` at build time, so the image
   generates a provider-matching client.
3. **Data migration assumptions:** Documentation states that SQLite metadata is
   not converted automatically.

## Related ADRs

| ADR | Relationship |
|-----|-------------|
| 0025 | Extends the SQLite Prisma decision with PostgreSQL Docker deployment |
| 0027 | Keeps automatic migration application, with provider-specific schema paths |
