# ADR 0006: GitProvider Implementation — System Git CLI via execa

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The Technical Specification (§8.1) defines `GitProvider` as the unified interface for Git operations, listing "Repository operations (create, clone, delete)" as the first requirement. §15 leaves the concrete implementation open (question #3: "system CLI vs isomorphic-git").

The first feature scoped for implementation is creating an empty Git repository via the web interface. This requires a concrete `GitProvider` implementation and a decision on how repository metadata (name, description, timestamps) is stored.

Additionally, ADR 0001 (risks) calls for a de-risking spike of Git smart-HTTP streaming through Nitro before full implementation of clone/push. The crate-repository feature does not involve HTTP streaming, so this spike remains a separate concern.

## Alternatives Considered

### GitProvider implementation: system Git CLI vs isomorphic-git

**System Git CLI via `node:child_process`:**
- Full Git feature set: the CLI supports every Git operation natively (init, clone, push, fetch, receive-pack).
- Battle-tested: every self-hosted Git platform (Gitea, Forgejo, GitLab, GitHub) uses the system Git CLI for repository operations.
- Smart-HTTP: the CLI `git-http-backend` handles the binary protocol streaming required by the spec. Our chosen `execab` wrapper does not interfere with this — raw `execa` calls can be used for the streaming endpoints when implemented.
- No additional JS dependencies beyond `execa` (a thin ESM-native wrapper).
- Requires Git to be present in the runtime environment (acceptable for Docker-based deploy).

**isomorphic-git (pure JS):**
- No system dependency — pure JavaScript implementation.
- However: limited smart-HTTP support, larger bundle, async API with manual filesystem backends.
- Higher risk for future clone/push HTTP streaming (ADR 0001 risk).
- Less mature for bare repository operations.

### Metadata persistence: filesystem scan vs database

**Filesystem scan (no database):**
- No DBMS choice required — defers question #1 from §15.
- Metadata derived from the bare-repository filesystem: name from directory name, description from the `description` file (created by `git init --bare`), createdAt from directory `birthtime`/`mtime`.
- Simpler code, faster time-to-MVP.
- Limitation: no relational queries; the list is always a full directory scan. Acceptable for MVP (< 1000 repos).

**Database-backed:**
- Required by §8.2's `DatabaseProvider` abstraction.
- Requires choosing a DBMS and ORM (§15 questions #1 and #4) — a large decision that would block the current slice.
- Can be introduced later, coexisting with or replacing FS-scan by reading from the `DatabaseProvider` instead of scanning directories.

### Child-process wrapper: system `child_process` vs `execa`

**`execa` (recommended):**
- ESM-native, Promise-based API — no manual wrapping of `execFile` callbacks.
- Structured error handling via `ExecaError` (`.exitCode`, `.stderr`, `.shortMessage`, `.failed`, `.timedOut`).
- Automatic argument sanitization (array arguments avoid shell injection, same security as `execFile`).
- Built-in `timeout` option.
- Already widely adopted in the Node.js ecosystem.

**Raw `node:child_process`:**
- Requires manual Promise wrapping of `execFile` (callbacks or `util.promisify`).
- Errors are basic Node.js `Error` objects — no structured metadata.
- No built-in timeout.
- Higher boilerplate for command execution.

## Decision

1. **GitProvider implementation:** system Git CLI via `execa` (`execab('git', [...args])`).
2. **Metadata persistence:** filesystem scan — no database for MVP. `DatabaseProvider` remains a stub.
3. **Child-process wrapper:** `execa` (v9.x, ESM-native).

### Concrete design

```
src/modules/git/
  git-provider.ts           — GitProvider interface + RepositoryInfo type
  providers/
    cli-git-provider.ts      — CliGitProvider: git init --bare via execa + fs.scan
  index.ts                   — barrel: exports GitProvider, CliGitProvider, gitProvider singleton
```

The provider implementation:
- Stores bare repositories in a configurable directory (`REPOSITORIES_PATH`, default `./data/repositories`).
- Validates repository names against path-injection patterns (prefixed path check).
- Describes repos via the `description` file in the bare repo (skipping the default Git placeholder text).
- Lists repos by scanning the storage directory for directories containing `HEAD` (bare-repo sentinel).

## Consequences

### Positive
- No DBMS/ORM decision needed now — filesystem scan is sufficient for MVP.
- System Git CLI is the most proven approach for Git hosting — no risk of incompatible Git behaviour.
- `execa` provides clean async API and structured errors, reducing boilerplate vs raw `child_process`.
- Storage path is configurable via environment variable — supports the spec's `STORAGE_TYPE=local` pattern.

### Negative
- Git must be available in the runtime environment (Docker image must include Git).
- `birthtime` is not available on all filesystems — falls back to `mtime` on those.
- Listing requires a full directory scan; no filtered/sorted queries without a database.

### Risks and Mitigations

1. **Path-traversal via repository name**
   _Mitigation:_ `validateName()` rejects names with `/`, `..`, leading dots, and special characters. `resolvePath()` verifies the resolved path is a prefix of the storage root.

2. **Race condition on concurrent repo creation**
   _Mitigation:_ `exists` check + `init` has a TOCTOU window. For MVP single-server, acceptable. Future: use directory-level locking or atomic `mkdir` with `EEXIST` check.

3. **Birthtime not available**
   _Mitigation:_ Falls back to `mtime` via `stat.birthtime ?? stat.mtime`.

4. **Default description file text**
   _Mitigation:_ The `description` file created by `git init --bare` contains "Unnamed repository; edit this file to 'name' the repository." — this is treated as no description.

## Open Questions

- When `DatabaseProvider` is implemented (future ADR), should `Repository` metadata be migrated from FS to DB? Decision deferred.
