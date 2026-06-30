# ADR 0009: Commit History — Extension of GitProvider

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The repository detail page needs to display a commit count for the active branch and a clickable entry point to view the full commit history. This requires the `GitProvider` to support three new operations:

1. List branches (to determine the active branch via `HEAD` marker).
2. List commits in a given branch (for the history view).
3. Count commits in a given branch (for the badge on the repository page).

## Alternatives Considered

### 1. Counting via `listCommits(...).length`
- Simpler code — no new method.
- Wastes cycles: fetches and parses all commit objects just to get a count.
- For repos with thousands of commits, this would be extremely slow.
- **Rejected** — prefer `git rev-list --count` for O(1)-ish performance.

### 2. Branch name from `git symbolic-ref --short HEAD`
- Possible but only gives the current `HEAD` branch.
- Does not return other branches — not forward-compatible with branch switching UI.
- **Rejected** in favour of a proper `listBranches` method, which can power future branch-picker UIs.

### 3. Embedding body (`%b`) in commit output
- Commit body can span multiple lines, complicating line-based parsing with `\0` separators.
- Not needed for the MVP (subject-only list is sufficient).
- **Deferred** — can be added later as an optional field.

## Decision

1. **New types** in `src/modules/git/git-provider.ts`:
   - `BranchInfo { name: string; isHead: boolean }`
   - `CommitInfo { sha, shortSha, authorName, authorEmail, authoredAt, committedAt, subject }`

2. **New interface methods** on `GitProvider`:
   - `listBranches(name: string): Promise<BranchInfo[]>`
   - `listCommits(name: string, options?: { ref?: string; limit?: number }): Promise<CommitInfo[]>`
   - `countCommits(name: string, ref?: string): Promise<number>`

3. **Implementation** in `CliGitProvider`:
   - `listBranches`: `git for-each-ref --format='%(refname:short)%00%(HEAD)' refs/heads`
   - `listCommits`: `git log --pretty=format:'<fields %00 delimited>' -n <limit> <ref>`, per-commit line delimited by `\n`.
   - `countCommits`: `git rev-list --count <ref>`.
   - All methods validate name, check repo existence, and return `[]`/`0` for empty repos (missing ref).

4. **No `body` field** in `CommitInfo` for the MVP.

## Consequences

### Positive
- Count is cheap (`rev-list --count` reads only the commit-chain length, no object parsing).
- `listBranches` provides a foundation for future branch-selector/review UI.
- Subject-only commit list keeps parsing simple and robust.

### Negative
- Body is unavailable in commit history view until a future iteration.
- One extra ADR-gate for a small feature, but the interface change justifies it.

## Risks and Mitigations

1. **Parsing fragility with `git log` output format**
   - Using null (`\0`) as intra-commit delimiter and newline as inter-commit delimiter.
   - Subject (`%s`) is guaranteed by git to be the first line of the commit message with leading/trailing whitespace stripped.
   - Risk: if `%s` can contain newlines. Mitigation: it does not — `%s` is defined as the subject (first line of commit message, with leading whitespace/newlines stripped). `%b` (body) is not used.

2. **Large repos**
   - `listCommits` takes a `limit` parameter (default 100). No unbounded listing.
   - `countCommits` scales with commit DAG size but is O(commits) in the worst case — acceptable for MVP.

3. **Empty repos**
   - `for-each-ref refs/heads` returns empty output → returns `[]`.
   - `rev-list --count HEAD` errors when `HEAD` does not point to a valid commit → caught by `refExists` check, returns 0.
   - `log <ref>` errors when `HEAD` does not point to a valid commit → caught by `refExists`, returns `[]`.

