# Pull Request Code Review

Nirvana tracks reviewed files on the **Files changed** tab of a pull request.

## Marking a File as Viewed

1. Open a pull request.
2. Select the **Files changed** tab.
3. Select **Viewed** in a file header after reviewing its diff.

The file diff collapses immediately. Clear the checkbox to expand the diff and remove the viewed mark. Marks are stored with the pull request and remain after reloading the page.

## File Identity

Viewed state is associated with the file path:

- Added and modified files use their new path.
- Renamed files use their new path.
- Deleted files use their old path.

If the contents of a path change later, the path remains marked as viewed.

## Current Limitation

The MVP uses a single NoAuth identity, so viewed marks are shared. Per-user review progress will be added with full authentication support.

