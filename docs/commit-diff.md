# Commit Diff Viewer

Nirvana supports side-by-side diff viewing for individual commits in the commit history. This document describes the feature's behavior and limitations.

## Accessing the Diff View

1. Navigate to a repository's commit history page at `/repositories/<name>/tree/<branch>/commits`.
2. Click on any commit row (or its short SHA).
3. The commit detail page opens at `/repositories/<name>/tree/<branch>/commits/<sha>` showing:
   - Commit metadata (SHA, author, date, subject)
   - A list of changed files, rendered one after another
   - Each file's diff is displayed side-by-side: old version on the left, new version on the right

## Diff Display

- **File status badges:** ADDED (green), MODIFIED (yellow), DELETED (red), RENAMED (blue)
- **Side-by-side view:** each hunk is rendered as two columns (old | new) with line numbers
- **Syntax highlighting:** code is highlighted using highlight.js, detected from file extension
- **Line coloring:** removed lines have a red-tinted background, added lines have a green-tinted background
- **Binary files:** shown as "Binary file not shown" with no inline diff

## Limitations

- **Merge commits:** inline hunk diffs are not shown for merge commits (combined diff parsing is future work). The changed-file list is still displayed.
- **Rename detection:** renames are shown in the file list but their hunks appear as delete + add in the patch view.
- **Large files:** hunk-based approach limits memory per file — only changed regions are visible.
- **Single-container:** the diff is computed server-side on page load; no pagination or lazy loading yet.

## Technical Details

The diff is computed server-side via `git diff-tree -p --root <sha>`. The unified diff output is parsed into structured `DiffFile`/`DiffHunk`/`DiffLine` objects and sent to the client as a TanStack Start RPC response. The client renders the diff using a custom `SplitDiffView` component with `highlight.js` for syntax highlighting and Mantine for layout.
