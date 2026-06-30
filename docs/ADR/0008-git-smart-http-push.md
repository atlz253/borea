# ADR 0008: Git Smart-HTTP Push Implementation

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

ADR 0007 implemented the read side of Git smart-HTTP (pull/clone via `git-upload-pack`)
and deferred the write side (push via `git-receive-pack`). It left an open question:
*"When push is implemented, should `git http-backend` replace manual invocations?"*

The `GitProvider` interface was designed generically over `GitService` (which includes both
`"git-upload-pack"` and `"git-receive-pack"`), and the `CliGitProvider` implementation
already maps `git-receive-pack` → `receive-pack` command name. The service layer
(`smart-http.service.ts`) also already provides `contentTypeFor` entries and
`formatAdvertisement` support for `git-receive-pack`.

The remaining gaps for push are:
1. `parseSmartHttpPath` — no branch for the `git-receive-pack` POST endpoint.
2. API route guards — GET `info/refs` and POST handler hardcode `git-upload-pack`.

## Decision

1. **Approach:** keep manual `git receive-pack --stateless-rpc` via `execa`, symmetric
   to the existing `git upload-pack` implementation. Do not switch to `git http-backend`.
2. **Route changes:** extend the existing catch-all route at `/api/git/$` to accept
   `git-receive-pack` alongside `git-upload-pack` for both the GET info/refs advertisement
   and the POST request body.
3. **NoAuth production guard:** deferred to a separate cross-cutting slice (see §5.3 of
   the specification). Push behaves like all other write operations — no production guard
   until the NoAuth infrastructure is built.
4. **ADR 0007 open question resolved:** manual `--stateless-rpc` is retained for both
   upload-pack and receive-pack, because:
   - The provider is already generic over `GitService` — no duplication.
   - Both services use identical subprocess invocation patterns via `execa`.
   - The pkt-line advertisement formatting is a generic helper (∼10 LOC).
   - Gzip decompression in the route layer works identically for both.
   - `git http-backend` would add CGI header parsing without reducing existing code.

## Consequences

### Positive
- Push requires only small, localized changes: a new branch in the path parser, two
  relaxed guard conditions in the route, one E2E test, and this ADR.
- The symmetric manual approach keeps the codebase consistent — no special casing for
  receive-pack vs upload-pack.
- The ADR 0001 de-risking milestone (streaming binary protocol through Nitro) is
  further validated with a write-direction E2E test.

### Negative
- Push uses the same manual approach as pull; `git http-backend` is not evaluated.
  If future requirements (e.g., dumb protocol, git submodule support) make http-backend
  desirable, a migration ADR would be needed.

### Risks and Mitigations

1. **Anonymous push spoofing in production (NoAuth mode)**
   _Mitigation:_ this is inherent to NoAuth mode as designed in the MVP specification (§5.3).
   Production deployment must either use the `ALLOW_NOAUTH_IN_PRODUCTION` flag consciously
   or implement real authentication. Production guard will be added in a dedicated slice.
