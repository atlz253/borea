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

## Commenting on a File

Each changed file has one discussion block below its diff:

1. Open an open pull request and select **Files changed**.
2. Enter plain text in the comment field below a file.
3. Select **Add comment**.

Comments are shown from oldest to newest and remain visible when the diff is collapsed as Viewed. Users with repository read access can comment. After a pull request is merged or closed, existing comments remain visible but no new comments can be added.

Comments are associated with the same file identity as Viewed state. If a path is no longer part of an open pull request diff, its comments remain stored but are not displayed. Merged and closed pull requests show such comments as archived discussion blocks.

## Current Limitations

- Comments are plain text and cannot be edited, deleted, replied to, or resolved.
- Comments apply to the whole changed file. Line-level comments remain planned.
- The MVP uses a single NoAuth identity when NoAuth mode is enabled, so viewed marks are shared. Per-user review progress will be added later.
