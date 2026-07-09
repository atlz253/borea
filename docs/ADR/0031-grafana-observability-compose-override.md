# ADR 0031: Grafana Observability Compose Override

**Status:** Accepted
**Date:** 2026-07-09

## Context

Borea now emits structured Pino logs and can export OpenTelemetry traces. The
project needs a local/self-hosted way to inspect logs and traces without making
the default single-container deployment noisy or exposing observability tools
publicly.

The repository root also contained Docker-specific files. Keeping all Docker
artifacts in a dedicated directory makes the root easier to scan and leaves the
base application compose file separate from optional observability services.

## Alternatives Considered

### Put Grafana services in the base compose file

- **Pros:** One command starts everything.
- **Cons:** The default deployment becomes heavier and exposes more services
  than the application needs.

### Separate compose override with Grafana stack

- **Pros:** Observability is opt-in; the base app stays a single service;
  Grafana, Loki, Tempo, and Alloy can evolve together.
- **Cons:** Operators need a second compose file for observability.

### External SaaS observability

- **Pros:** Less infrastructure to run.
- **Cons:** Requires vendor setup and does not fit offline/local development.

## Decision

Move Docker artifacts into `docker/` and keep the base compose file limited to
the `borea` service. Add `docker/compose.observability.yaml` as an optional
override that starts:

- Grafana for viewing logs and traces;
- Loki for log storage;
- Tempo for trace storage;
- Grafana Alloy for Docker log collection and OTLP trace ingestion.

Grafana is bound to `127.0.0.1` only. Remote access must use an SSH tunnel
rather than a public port. Default observability values are committed in
`docker/.env.observability`; real values belong in
`docker/.env.observability.local`, which is ignored by Git.

## Consequences

### Positive

- The default Docker deployment remains a single application container.
- Logs and traces can be viewed together in Grafana.
- Grafana is not exposed on public interfaces by default.
- Real observability credentials stay out of version control.

### Negative

- Observability startup requires a compose override.
- Alloy reads Docker logs through the Docker socket, which is a sensitive host
  interface even when mounted read-only.

### Neutral

- The base `.env` remains in the repository root as application configuration.
- `docker/Dockerfile.dockerignore` is kept with the Dockerfile so the moved
  Dockerfile still gets an effective Docker ignore file while using the
  repository root as build context.
