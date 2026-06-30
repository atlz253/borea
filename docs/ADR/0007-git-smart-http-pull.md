# ADR 0007: Git Smart-HTTP Pull Implementation

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The Technical Specification (§4.2) requires HTTP/HTTPS for clone/pull operations. ADR 0001
identifies Git smart-HTTP streaming through Nitro as the highest technical risk (§6.1, Risks),
requiring a de-risking spike as the first implementation step. ADR 0006 chose the system Git
CLI via `execa` as the `GitProvider` implementation but deferred the smart-HTTP spike.

The first slice of smart-HTTP is the read side (pull/clone/fetch via `git-upload-pack`).
Write side (push via `git-receive-pack`) is deferred.

## Alternatives Considered

### 1. Manual `git upload-pack --stateless-rpc` vs `git http-backend`

**Manual `git upload-pack --stateless-rpc` (chosen):**
- Direct subprocess invocation, consistent with existing `CliGitProvider` methods (`init`,
  `ls-tree`). Same code style, same `execa` pattern.
- No CGI header parsing — the route sets HTTP headers directly.
- Gzip decompression of the POST body is handled explicitly in the route layer.
- The pkt-line service advertisement ("# service=git-upload-pack") is formatted by a thin
  service-layer helper — approximately 10 lines of code.

**`git http-backend` (CGI):**
- Single CGI endpoint that handles the full protocol (both upload-pack and receive-pack,
  dumb and smart). Used by Gitea, Forgejo, GitLab.
- Requires setting 6+ CGI environment variables (`GIT_PROJECT_ROOT`, `PATH_INFO`,
  `REQUEST_METHOD`, `QUERY_STRING`, `CONTENT_TYPE`, `CONTENT_ENCODING`).
- Requires parsing CGI-style headers from stdout (`Status:`, `Content-Type:`) before
  streaming the body — extra complexity for a read-only slice.
- Provides gzip decompression automatically — but the CGI env setup is more opaque.

Decision: manual `--stateless-rpc` for this slice. `http-backend` may be adopted later
when push is added, or kept as an alternative provider implementation.

### 2. GitProvider interface shape: stream methods vs HTTP-agnostic callbacks

**Stream-based methods (`advertiseRefs`, `invokeService`) returning `ReadableStream`:**
- HTTP-agnostic — the interface uses byte streams, not HTTP objects.
- Swappable — an isomorphic-git based provider could also produce/consume byte streams.
- The route layer converts Web streams to/from the HTTP response/request.

**Callback-based method accepting HTTP objects:**
- Binds the interface to the HTTP framework — violates provider abstraction principle (§7.3).

Decision: stream-based methods on `GitProvider`.

### 3. URL convention

`/api/git/<name>.git/*` following ADR 0001's `/api/git/*` namespace. The `.git` suffix is
conventional for Git clients (`git clone http://host/api/git/myrepo.git`). A catch-all
route (splat `$`) parses the path to extract the repo name (stripping `.git`) and endpoint
(`info/refs` or `git-upload-pack`).

## Decision

1. **Approach:** manual `git upload-pack --stateless-rpc` via `execa`, with pkt-line
   service advertisement formatting in a service layer.
2. **Provider interface:** extend `GitProvider` with `advertiseRefs()` and `invokeService()`
   returning `ReadableStream<Uint8Array>`.
3. **URL convention:** `/api/git/<name>.git/{info/refs,git-upload-pack}` via catch-all route.
4. **Gzip handling:** route layer checks `Content-Encoding: gzip` on POST and decompresses
   before streaming to git's stdin.
5. **ADR 0001 de-risking:** this implementation validates that streaming binary protocol
   data through TanStack Start API routes (`createAPIFileRoute`) works without buffering.

## Consequences

### Positive
- The highest technical risk from ADR 0001 (Git streaming through Nitro) is retired.
- Consistent code style with existing `CliGitProvider`.
- The `GitProvider` interface extension is generic enough for future push and for
  alternative provider implementations.

### Negative
- Gzip decompression must be handled explicitly (vs `http-backend` doing it automatically).
- The pkt-line service advertisement is formatted manually (approximately 10 lines of code).
- Push requires a separate slice.

### Risks and Mitigations

1. **Gzip decompression missed for some git client versions**
   _Mitigation:_ the route checks `content-encoding` header; all modern git clients send
   `gzip` for POST bodies. Verified by the E2E clone test.

2. **Stream lifecycle: subprocess exit vs response end**
   _Mitigation:_ `execa` subprocess stdout stream signals end when the process exits.
   The Web `ReadableStream.fromWeb` wrapper propagates backpressure and end-of-stream.
   Verified by E2E test.

3. **Race condition: subprocess stdin closed before git reads it**
   _Mitigation:_ pipe from the Web request stream to the subprocess stdin; the pipe
   handles backpressure. If the request body completes before git reads it, git handles
   partial input (the packfile protocol is framed).

## Open Questions

- When push is implemented, should `git http-backend` replace manual invocations?
  Decision deferred to push slice.
