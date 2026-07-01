# ADR 0013: Commit Diff — Extension of GitProvider

**Status:** Accepted
**Date:** 2026-07-01
**Author:** Architecture Team

## Context

The commit history page needs a clickable entry point to view the full diff per commit. The diff must be displayed side-by-side (old version on the left, new version on the right) with syntax highlighting. This requires the `GitProvider` to support two new operations:

1. Get a single commit's full metadata (including parent SHA) by commit SHA.
2. Get the structured diff (changed files with parsed hunks) for a commit.

## Alternatives Considered

### 1. Pure client-side diff computation
- Fetch both blob versions via `git show <sha>:<path>` and compute diff client-side (e.g., via `diff` JS library).
- Avoids server-side parsing of git's diff output.
- **Rejected** — requires reading entire blob contents for both versions, which is wasteful for large files; adds a JS diff dependency (unnecessary for MVP); server-side unified diff parsing is more performant.

### 2. Use `git show` combined output (metadata + patch in one call)
- Single `git show <sha>` call, parse both metadata and diff from the same output.
- Simpler code, fewer git invocations.
- **Rejected** — `git show` output format changes for merges (combined diff vs unified diff). Separating metadata, file-status, and patch into three calls (one cheap metadata-only, one for file status list, one for patch) is more robust and each call has a focused purpose.

### 3. Use a third-party diff rendering library
- `diff2html`, `react-diff-viewer-continued`, etc. provide ready-made side-by-side diff UIs.
- Faster implementation.
- **Rejected** — adds external dependency outside the Mantine design system (ADR 0004); `@mantine/code-highlight` is already available for syntax highlighting; a custom component gives consistent look-and-feel and full control.

### 4. Full-file side-by-side (entire old file vs entire new file)
- Show the complete old file on the left and the complete new file on the right.
- Simpler layout, no hunk alignment needed.
- **Rejected** — impractical for large files; hunk-based split is the industry standard (GitHub, GitLab) and focuses attention on changes.

## Decision

### New types in `src/modules/git/git-provider.ts`:

```typescript
export type DiffFileStatus = "added" | "modified" | "deleted" | "renamed";

export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  status: DiffFileStatus;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export interface CommitDetail {
  sha: string;
  shortSha: string;
  authorName: string;
  authorEmail: string;
  authoredAt: Date;
  committedAt: Date;
  subject: string;
  parentSha: string | null;
}

export interface GetCommitDiffResult {
  commit: CommitDetail;
  files: DiffFile[];
}
```

### New interface methods on `GitProvider`:

- `getCommit(name: string, sha: string): Promise<CommitDetail>`
- `getCommitDiff(name: string, sha: string): Promise<GetCommitDiffResult>`

### Implementation in `CliGitProvider`:

1. **`getCommit`**: `git show <sha> --no-patch --format=<EXTENDED_FORMAT>` where `EXTENDED_FORMAT = LOG_FORMAT + "%x00%P"`. Output: single line with `\0`-delimited fields including parent SHA (space-separated; empty for root). Parse into `CommitDetail` taking the first parent (or null for root). Merge commits with multiple parents will have the first parent set; the diff method handles merges separately.

2. **`getCommitDiff`**:
   - Call `getCommit` for commit metadata.
   - File status list: `git show <sha> --name-status --no-patch --format=`. Handles root, non-merge, and merge commits (uses combined diff for merges).
   - Patch (hunks): `git diff-tree -r -p --root --no-commit-id <sha>`. Works for root (all additions) and non-merge commits (unified diff vs parent). For merge commits this produces no output (empty hunks) — merge commits show file-status only.
   - Binary files detected via the "Binary files ... differ" line in the patch output.
   - All methods validate name (via `validateName`) and SHA (regex `^[0-9a-f]{7,40}$`), then resolve short SHA to full via `revParse`.

3. **Parsing** in `cli-git-parsers.ts`:
   - `parseUnifiedDiff(stdout)`: parses `diff --git` headers, `---`/`+++` file paths, `@@` hunk headers, and ` `/`-`/`+` lines into structured `DiffFile[]`.
   - `parseNameStatus(stdout)`: parses `A/M/D/R<score>\t<old>\t<new>` into `{status, oldPath, newPath}[]`.

### Merge commit handling:
- File status list is populated (from `git show --name-status` combined diff).
- Hunks are empty for merge commits.
- The UI shows a note: "Merge commit — inline diff not shown for combined changes."
- This is acceptable for MVP; full combined-diff parsing is future work.

### Rendering:
- A custom `SplitDiffView` component renders each `DiffFile` side-by-side using `@mantine/code-highlight` for syntax highlighting.
- File language is auto-detected from file extension via a simple mapping.

## Consequences

### Positive
- Structured diff types enable server-controlled rendering; the client never needs to parse git output.
- Side-by-side with code highlighting provides a clear, industry-standard diff experience.
- Merge commits degrade gracefully (file list without inline hunks).
- No new external dependencies (code-highlight already in `package.json`).

### Negative
- Two new methods on `GitProvider` — all implementations must be updated (currently only one `CliGitProvider`).
- Merge commit inline diff is not available in MVP — users cannot see detailed changes for merge commits via this view.

## Risks and Mitigations

1. **Parsing fragility with `git diff-tree -p` output**
   - Format is well-defined by git and stable across versions.
   - Rename/detection scores (`R100`) are parsed but ignored.
   - Binary file detection guards against large binary patch blobs.

2. **SHA collision / invalid SHA**
   - SHA validated with regex `^[0-9a-f]{7,40}$` before passing to git.
   - Short SHAs resolved to full via `revParse`; if the SHA does not exist, `revParse` fails and the error propagates.

3. **Large diffs**
   - Hunk-based approach limits memory per file; no unbounded blob reads.
   - The route loads the full diff on page request — acceptable for MVP (commits typically have few changed files).

4. **Rename detection**
   - `git show --name-status` uses git's built-in rename detection (default: 50% similarity). Renamed files appear as `R<score>\t<old>\t<new>`.
   - For patch output, `git diff-tree` does not produce rename headers by default; `--detect-renames` (or `-M`) would be needed. MVP limitation: renamed files show in file list but their hunks appear as delete + add. Acceptable for MVP.
