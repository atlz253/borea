# ADR 0014: Pull Request Diff — Three-dot Range Diff

**Status:** Accepted
**Date:** 2026-07-01
**Author:** Architecture Team

## Context

The MVP (§4.1) requires pull request viewing with changed-file diffs. The codebase currently has:

- `GitProvider.getCommitDiff(name, sha)` — diffs a single commit against its first parent. Returns a `CommitDetail` + `DiffFile[]`. Not suitable for a pull request (PR) where the diff spans a range: `sourceBranch` vs `targetBranch`.
- `GitProvider.canMerge(name, head, base)` — already accepts two arbitrary branch refs (`head`, `base`) for mergeability checking, proving the two-ref pattern fits the interface.
- `SplitDiffView` — a reusable side-by-side diff component that accepts any `DiffFile` and renders it. Lives in the repositories module but is purely presentational.
- `PullRequest` model — stores `sourceBranch` and `targetBranch` as string refs. No diff data is persisted; diffs are computed live from Git.
- Pull request detail page (`/repositories/$name/pulls/$pullId`) — shows metadata and merge controls but has no "Files changed" view and no tabbed navigation.

Three-dot diff semantics (`git diff base...head`) show only changes on the source branch since it diverged from the target branch, matching GitHub's default PR view. This is more useful than two-dot (`git diff base head`) which would also include changes on the target branch that are unrelated to the PR.

## Alternatives Considered

### 1. Method placement: `getDiff` on GitProvider vs. separate function

**On GitProvider interface (chosen):**
- Consistent with all other Git operations (getCommit, getCommitDiff, mergeBranch, canMerge).
- The mock/fake contract includes it, enforcing correctness.
- `CliGitProvider` implements it naturally via `git merge-base` + `git diff-tree`.

**Separate standalone function:**
- Would need to call `gitProvider.getCommit` and `gitProvider.getCommitDiff` internally — awkward because `getCommitDiff` returns a `CommitDetail` we don't need.
- No benefit; violates consistency.

### 2. Return type: `DiffFile[]` vs. `GetDiffResult { baseSha, headSha, files }`

**`DiffFile[]` (chosen):**
- The caller already knows the base and head refs (they are the PR's targetBranch and sourceBranch).
- Adding SHA metadata would need extra git calls (`revParse` on both refs) before every diff fetch.
- Consistent with the principle that the UI can compute derived data.

**`GetDiffResult`:**
- Would provide resolved SHAs for display purposes.
- Rejected because the PR module already has the branch names; resolved SHAs can be fetched separately if needed.

### 3. CLI implementation: `git diff` vs. `git diff-tree` vs. `git merge-base` + `git diff-tree`

**`git merge-base` + `git diff-tree` (chosen):**
- `git diff-tree -r --name-status <tree1> <tree2>` works on bare repositories — no worktree required. Already used by `getCommitDiff`.
- `git diff-tree -r -p <tree1> <tree2>` produces standard unified diff output that our existing `parseNameStatus` and `parseUnifiedDiff` parsers consume without changes.
- The three-dot semantics are achieved by computing the merge-base first via `git merge-base <base> <head>`.
- Two git calls (merge-base + diff-tree) — same pattern as `getCommitDiff` (which makes two diff-tree calls).

**`git diff base...head`:**
- Simpler command (`git diff` handles `...` natively).
- But `git diff` with `--git-dir` on a bare repo may fail in some configurations (requires `GIT_WORK_TREE` or `--no-index`).
- Less control over the output format.
- Rejected to avoid bare-repo compatibility issues.

**`git diff-tree` with `base` and `head` directly (two-dot):**
- `git diff-tree -r -p <base> <head>` shows all differences between the two tips (two-dot).
- Does not merge-base; not a three-dot diff.
- Rejected because three-dot was explicitly chosen for the UI.

### 4. Tab implementation: URL-driven routes vs. client-side tabs

**URL-driven routes (chosen):**
- Consistent with the existing Code/Pulls tabs (ADR 0012) and the commits layout (ADR 0013).
- Deep-linkable: `/repositories/$name/pulls/$pullId/files` can be shared/bookmarked.
- Each tab has its own loader, so the diff is only fetched when the "Files changed" tab is active.

**Client-side Mantine Tabs:**
- Simpler to implement (no new route files).
- Not deep-linkable; the diff loads even if the user never clicks "Files changed."
- Rejected for consistency with the existing tab pattern and to avoid unnecessary diff loads.

## Decision

1.  **`GitProvider` extension** in `src/modules/git/git-provider.ts`:
    - `getDiff(name: string, base: string, head: string): Promise<DiffFile[]>`
    - Returns `DiffFile[]` (no `CommitDetail` — it is a range, not a single commit).
    - Uses three-dot semantics (merge-base of base and head, then diff from merge-base to head).

2.  **`CliGitProvider` implementation** in `src/modules/git/providers/cli-git-provider.ts`:
    - Validate both refs exist (`refExists`).
    - Compute merge-base: `git merge-base <base> <head>`.
    - Name-status pass: `git diff-tree -r --name-status <merge-base> <head>` → `parseNameStatus`.
    - Patch pass: `git diff-tree -r -p <merge-base> <head>` → `parseUnifiedDiff`.
    - Merge hunks into file list by path matching, handling binary files.
    - Return `DiffFile[]`.

3.  **`mergeBase` helper** in `src/modules/git/providers/cli-git-helpers.ts`:
    - Exported function `mergeBase(gitBin, repoPath, base, head): Promise<string>`.
    - Runs `git merge-base <base> <head>`, returns the full SHA.

4.  **`SplitDiffView` migration** from `src/modules/repositories/components/` to `src/components/`:
    - Pure presentational component — not domain-specific.
    - Enables cross-module reuse without creating `pull-requests → repositories` dependency.
    - Barrel re-export updated; `CommitDiffPage` import updated.

5.  **`PullRequestService` extension** in `src/modules/pull-requests/pull-request.service.ts`:
    - `getPullRequestDiff(repoName: string, id: number): Promise<DiffFile[]>`.
    - Resolves PR from store, calls `gitProvider.getDiff(name, pr.targetBranch, pr.sourceBranch)`.
    - Returns `DiffFile[]`.

6.  **Server function** in `src/modules/pull-requests/server/pull-request.functions.ts`:
    - `getPullRequestDiffFn` — GET server function with `getPullRequestSchema` validator.
    - Calls `service.getPullRequestDiff(repoName, id)`.

7.  **Routing** (URL-driven tabs under `/repositories/$name/pulls/$pullId/`):
    - `repositories.$name.pulls.$pullId.tsx` — layout route: "Back" link + Mantine Tabs (Conversation, Files changed) + `<Outlet />`. No loader.
    - `repositories.$name.pulls.$pullId.index.tsx` — Conversation tab: loader fetches PR + merge status, renders `PullRequestDetailPage` (existing component, unchanged behavior).
    - `repositories.$name.pulls.$pullId.files.tsx` — Files changed tab: loader fetches PR + diff (`DiffFile[]`), renders `PullRequestFilesPage`.

8.  **UI**:
    - `PullRequestFilesPage` — new page in `src/modules/pull-requests/pages/`.
    - Renders: PR title + status badge header, then `files.map(f => <SplitDiffView key={...} file={f} />)`.
    - Empty state: "No file changes" message.
    - Uses `SplitDiffView` from `#/components`.

## Consequences

### Positive
- Three-dot diff matches GitHub UX — users see only changes on the source branch.
- Reuses existing `parseNameStatus`, `parseUnifiedDiff` parsers, `MergeOptions`, and `SplitDiffView` — zero new dependencies.
- URL-driven tabs are deep-linkable and consistent with the existing routing pattern.
- The diff is computed live from Git — no extra storage or PR-model changes needed.
- Bare-repo-safe implementation via `git diff-tree` (no worktree required).

### Negative
- Two git calls per diff (`merge-base` + `diff-tree`). Acceptable for MVP; the bottleneck is Git CLI startup time.
- PR is loaded twice when switching tabs (once per child route). Each load is a single JSON file read — negligible for MVP.
- Three-dot diff for completely unrelated histories (uncommon) will error at the `merge-base` step — user sees a clear error.

### Risks and Mitigations

1.  **Merge-base resolution fails (unrelated histories)**
    _Mitigation:_ `git merge-base` returns non-zero exit code; the method throws with a clear message. The UI shows an error alert.

2.  **Empty diff (no changes on source since merge-base)**
    _Mitigation:_ `diff-tree` returns empty output; `parseNameStatus` returns empty array; the UI shows "No file changes."

3.  **Source or target branch deleted after PR creation**
    _Mitigation:_ `refExists` validates both refs before computing the diff; throws with "Ref X not found" — same as `canMerge`/`mergeBranch`.

## Open Questions

- Should the "Files changed" tab show diff statistics (file count, total additions/deletions)? Deferred to a future UX iteration.
