# ADR 0012: Pull Requests — Storage, Merge, and Routing

**Status:** Accepted
**Date:** 2026-07-01
**Author:** Architecture Team

## Context

The MVP (§4.1) requires Pull/Merge requests: create, view, close, and merge. The repository page needs a "Pull requests" tab alongside the existing "Code" tab.

The codebase currently has:
- `GitProvider` (`src/modules/git/git-provider.ts`) supporting repository, file, branch, and commit operations — but no merge or conflict-detection primitives.
- `DatabaseProvider` is a stub (ADR 0006 stores repository metadata via filesystem scan; no DBMS chosen yet — §15 question #1 deferred).
- The `pull-requests` module exists only as an empty barrel (`export {}`).
- The repository page shell `src/routes/repositories.$name.tsx` renders a bare `<Outlet />` with no shared header or tabs; `RepositoryPage` composes the title, clone info, branch switcher, and file tree in a single component.

This ADR decides: (1) where Pull Request metadata lives, (2) how merge is performed on a bare repository, (3) how mergeability/conflicts are detected, and (4) how the PR tab is surfaced in the UI.

## Alternatives Considered

### 1. PR metadata storage

**JSON files in storage (chosen):**
- A directory `./data/pull-requests/<repo>/<id>.json` per PR, plus a `_meta.json` counter.
- Consistent with ADR 0006 (no DB for MVP metadata).
- Trivial to inspect/debug; trivially portable to a DB later by swapping the store implementation.
- Limitation: directory scan for list; linear in PR count. Acceptable for MVP (< 1000 PRs per repo).

**Git refs + notes in the bare repo:**
- `refs/pull/<id>/head` for the source SHA, `refs/pull/<id>/merge` for the merge SHA, git notes for title/status.
- Metadata lives inside the Git repository itself — no separate store.
- Rejected: parsing statuses and timestamps from notes is fragile, and statuses like "closed" have no natural git representation. Harder to query and update atomically.

**Introduce SQLite via `DatabaseProvider`:**
- Cleanest relational model; future-proof for comments, reviews, and audit.
- Rejected for this slice: requires choosing a DBMS and ORM (§15 #1, #4) and a real `DatabaseProvider` implementation — a large separate ADR. Out of scope for the PR feature and would block it. The JSON store can be migrated to a DB later behind the same service interface.

### 2. Merge strategy

**Merge commit (no-ff) by default, fast-forward when possible (chosen):**
- Matches the most familiar UX (GitHub, GitLab default). Always produces an audit trail merge commit unless the user explicitly chooses FF.
- Supports divergent histories (true merge) — required when the target branch has moved.

**Fast-forward only:**
- Simplest to implement (`git update-ref`).
- Rejected: rejects divergent histories, forcing rebase on the author. Too rigid for an MVP that wants to "just merge".

**Always merge commit (no-ff, even when FF is possible):**
- Predictable, but discards the cheap FF path for trivial PRs.
- Rejected in favour of offering FF as an option when the histories are linear.

### 3. Performing a merge on a bare repository

System Git cannot run `git merge` directly on a bare repo (no worktree). Two implementation paths:

**Low-level `git merge-tree --write-tree` + `git commit-tree` + `git update-ref` (chosen):**
- `git merge-tree --write-tree <base> <head>` (Git ≥ 2.38) computes the merged tree object without a worktree, prints the tree SHA, and reports conflicts via exit code and `--name-only`-style output.
- On success: build a commit via `git commit-tree <tree> -p <base> -p <head> -m <msg>`, then `git update-ref refs/heads/<base> <new-commit>`.
- For fast-forward: simply `git update-ref refs/heads/<base> <head-sha>` (no new commit needed).
- No temporary worktree, no working-tree state, fully stateless — ideal for a stateless Nitro server.

**Temporary worktree:**
- `git worktree add` a temp dir, `git merge` there, push back.
- Rejected: more I/O, slower, leaves worktree refs that must be cleaned up, harder to reason about under concurrent requests.

### 4. Conflict / mergeability detection

`git merge-tree --write-tree --name-only <base> <head>`:
- Exit 0 → mergeable. The output begins with the merged tree SHA on the first line.
- Exit 1 → conflicts. The output begins with a NUL-separated list of conflicting file paths (the tree SHA is not emitted), making it straightforward to surface the conflicting files to the UI.
- Fast-forward is detected separately by checking whether `<base>` is an ancestor of `<head>` (`git merge-base --is-ancestor <base> <head>`).

### 5. PR tab navigation

**URL routes + Mantine `Tabs` driven by `<Link>` (chosen):**
- Lift the shared repository header and tabs into `src/routes/repositories.$name.tsx` as a layout with `<Outlet />`.
- Tabs map to routes: "Code" → `/repositories/$name` (redirect to default branch as today), "Pull requests" → `/repositories/$name/pulls`.
- Deep-linkable, shareable, bookmarkable. Per-tab loaders stay independent.

**Client-side tabs inside `RepositoryPage`:**
- Rejected: not deep-linkable; duplicates the shell for PR pages; loses the loader-per-route benefit.

## Decision

1. **Storage:** `FileSystemPullRequestStore` writing JSON files to `${PULL_REQUESTS_PATH}/<repo>/<id>.json` (default `./data/pull-requests`). A shared `_meta.json` holds the per-repo counter. The store is accessed through a service; the service is the only consumer, keeping the storage backend swappable.

2. **Config:** add `pullRequestsPath` to `AppConfig` (`src/platform/config/index.ts`), sourced from the `PULL_REQUESTS_PATH` env var (default `./data/pull-requests`). Sibling to `REPOSITORIES_PATH`.

3. **`GitProvider` extension** in `src/modules/git/git-provider.ts`:
   - `canMerge(name, head, base): Promise<MergeStatus>` — `{ conflicts: boolean; fastForward: boolean; conflictingFiles: string[] }`.
   - `mergeBranch(name, head, base, options?: { fastForward?: boolean }): Promise<MergeResult>` — `{ mergedSha: string; fastForward: boolean }`. Throws on conflict when `fastForward` is not requested and conflicts are present.

4. **`CliGitProvider` implementation:**
   - `canMerge`: `git merge-tree --write-tree --name-only <base> <head>`; conflicts when exit code is non-zero; fast-forward when `git merge-base --is-ancestor <base> <head>` succeeds.
   - `mergeBranch`: FF path → `git update-ref refs/heads/<base> <head>`. Merge path → use the tree SHA from `merge-tree` (or recompute), `git commit-tree` with two parents, then `git update-ref`.

5. **Merge strategy:** merge commit (no-ff) by default; FF offered when `canMerge` reports `fastForward: true`. Conflicts block merging entirely.

6. **`pull-requests` module** under `src/modules/pull-requests/`:
   - `schemas.ts` — Zod schemas for create/list/merge.
   - `pull-request.store.ts` — `FileSystemPullRequestStore` (CRUD over JSON).
   - `pull-request.service.ts` — orchestrates store + `GitProvider` (create/list/get/merge).
   - `server/pull-request.functions.ts` — TanStack Start server functions (`createServerFn`).
   - `components/` and `pages/` — Mantine UI.
   - `index.ts` — barrel (per ADR 0003 module boundary rule).

7. **Routing** under `src/routes/`:
   - `repositories.$name.tsx` becomes a layout: shared header + Mantine `Tabs` + `<Outlet />`.
   - `repositories.$name.pulls.index.tsx` — PR list.
   - `repositories.$name.pulls.new.tsx` — create form.
   - `repositories.$name.pulls.$pullId.index.tsx` — PR detail with merge button.
   - `src/routeTree.gen.ts` regenerated via `npm run generate-routes`.

8. **PR model:**
   ```ts
   {
     id: number;
     repoName: string;
     title: string;
     sourceBranch: string;
     targetBranch: string;
     status: "open" | "merged" | "closed";
     mergeCommitSha?: string;
     authorName: string;
     createdAt: string;  // ISO
     updatedAt: string;  // ISO
   }
   ```

## Consequences

### Positive
- No DBMS decision required now; PR metadata is debuggable as plain JSON.
- Stateless merge via `merge-tree`/`commit-tree` works cleanly under Nitro's request model.
- Fast-forward path is cheap (`update-ref` only).
- URL-driven tabs are deep-linkable and match the existing file-based routing conventions.
- The store and `GitProvider` interfaces hide the implementation, so swapping to a DB or a non-CLI Git backend later is localized.

### Negative
- `git merge-tree --write-tree` requires Git ≥ 2.38 (released 2022-10). Older Git versions must fall back to a temporary worktree — not implemented in this iteration; documented as a requirement.
- List PRs is a directory scan per repo (linear). Acceptable for MVP.
- JSON store has no transactions; concurrent PR creation in the same repo could duplicate IDs. Mitigation: file write uses atomic rename from a temp file; counter is read-then-write under a best-effort in-process lock (single Nitro process per ADR 0001).
- No code review / line comments in this slice (deferred per MVP §4.1 — future iteration).

### Risks and Mitigations

1. **Git version too old for `--write-tree`**
   _Mitigation:_ Documented requirement (Git ≥ 2.38). The Docker image must bundle a suitable Git. A future fallback to worktree-based merge can be added without changing the `GitProvider` interface.

2. **Concurrent writes to the PR store**
   _Mitigation:_ Atomic write (temp file + rename). In-process mutex on the counter update. Single-server MVP per ADR 0001 makes cross-process races out of scope.

3. **Merge of stale PR (target moved after mergeability was computed)**
   _Mitigation:_ `mergeBranch` recomputes mergeability server-side at merge time and fails fast on conflict; PR transitions to a "conflict" state in the UI rather than producing a broken merge.

4. **Path traversal via repo name in PR store paths**
   _Mitigation:_ The store reuses the same repo-name validation as `CliGitProvider` (no `/`, `..`, leading dots) before converting a name to a filesystem path, and verifies the resolved path stays under the storage root.

## Open Questions

- When `DatabaseProvider` is implemented (future ADR), should PR metadata migrate from JSON to DB? Decision deferred — the service interface isolates the store, so migration is localized.
- Line-level code review comments (MVP §4.1) — scope for a follow-up ADR/iteration.