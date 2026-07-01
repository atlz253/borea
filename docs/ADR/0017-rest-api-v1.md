# ADR 0017: REST API v1

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Architecture Team

## Context

The MVP requires a public REST API with an OpenAPI specification. The application already exposes Git smart-HTTP under `/api/git`, while repository and pull request operations are available only through TanStack Start server functions and the web interface.

The first public REST surface needs stable paths, consistent errors, runtime validation, and documentation generated from the same Zod schemas used by the handlers.

## Decision

1. Public REST endpoints use the `/api/v1` prefix. Git smart-HTTP remains under `/api/git`.
2. TanStack Start file-based server routes provide the HTTP transport and delegate to existing domain services.
3. Successful responses return resources directly. Errors use `{ code, message, details? }`.
4. Validation failures return `400`, missing resources return `404`, merge state or conflict failures return `409`, and unexpected failures return a generic `500`.
5. Domain services use typed errors from `src/platform/errors`; HTTP handlers do not classify errors by message text.
6. Repository deletion uses `DELETE /api/v1/repositories/{name}` without an additional confirmation payload and also removes stored pull request data.
7. Pull request merge uses `POST .../merge` with an optional `{ fastForward }` JSON body. A merge commit remains the default.
8. OpenAPI 3.1 is generated with `@asteasolutions/zod-to-openapi` from the runtime Zod schemas and served at `/api/v1/openapi.json`.

## Consequences

- The `/api/v1` contract can remain stable while later incompatible APIs use a new version prefix.
- Runtime validation and OpenAPI share schemas, reducing documentation drift.
- Typed domain errors make transport mapping deterministic and remain usable by the existing UI.
- The API is unauthenticated in NoAuth mode, including destructive repository deletion.
- Pagination, filtering, repository creation, pull request creation, and interactive API documentation remain outside this iteration.
