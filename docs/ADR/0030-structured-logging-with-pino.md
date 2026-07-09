# ADR 0030: Structured Logging with Pino

**Status:** Accepted
**Date:** 2026-07-09

## Context

Borea needs application logging that works well in a single-container Nitro
deployment and can later be correlated with distributed traces. The existing
`platform/logger` module only wrote warning strings to stderr, which is not
enough for request diagnostics, API failures, or production log collection.

The logging solution must fit the modular monolith architecture, avoid a
second server framework, keep secrets out of logs, and write to stdout/stderr
so container runtimes can collect logs without extra agents.

## Alternatives Considered

### Custom JSON logger

- **Pros:** No new dependency; complete control over output shape.
- **Cons:** Reinvents redaction, child loggers, level handling, serializers,
  and development formatting.

### Pino

- **Pros:** Fast structured JSON logger; built-in redaction; child loggers for
  request context; standard error serializers; optional pretty output for local
  development; compatible with OpenTelemetry transports.
- **Cons:** Adds a runtime dependency and a development-only pretty-printing
  dependency.

### Winston

- **Pros:** Mature and flexible transport ecosystem.
- **Cons:** Heavier than needed for container stdout logging and less aligned
  with low-overhead request logging.

## Decision

Use Pino as the implementation behind `#/platform/logger`.

The public application import remains `#/platform/logger`; domain and platform
code should not import Pino directly. The logger writes structured JSON by
default, uses pretty output in local development, and redacts common sensitive
fields such as authorization headers, cookies, passwords, tokens, and session
secrets.

Add TanStack Start request middleware in `src/start.ts` to log request start,
finish, errors, status, duration, handler type, path, method, and a request id.
The middleware also publishes `x-request-id` on responses and stores a
request-scoped child logger in async-local context for deeper server code.

## Consequences

### Positive

- Production logs are machine-readable and container-friendly.
- REST, Git smart-HTTP, SSR, and server functions get consistent request logs.
- Unexpected API errors are logged server-side without exposing internals in
  public responses.
- Future OpenTelemetry trace/log correlation can use the same request-scoped
  logging layer.

### Negative

- Runtime logging now depends on Pino.
- Pretty local output depends on `pino-pretty`.

### Neutral

- OpenTelemetry export is a separate follow-up; this decision establishes the
  structured logging foundation and correlation fields.
