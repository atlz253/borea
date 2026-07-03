# ADR 0022: Pull Request File Comments

**Status:** Accepted
**Date:** 2026-07-03
**Author:** Architecture Team

## Context

The Files changed tab supports persistent Viewed state but has no discussion mechanism. The MVP needs one append-only discussion block for each changed file. Line-level comments remain a future requirement.

Pull request metadata is exposed through REST API v1. Adding comments directly to `PullRequest` would change that public representation even though this increment is web-only.

## Alternatives

**Embed comments in pull request JSON:**
- Simple loading and persistence.
- Rejected because it changes the REST representation and mixes potentially unbounded discussion data with PR metadata.

**Store one mutable note per file:**
- Smaller data model.
- Rejected because it does not support discussion between reviewers.

**Store comments separately per pull request (chosen):**
- Preserves the current REST contract.
- Supports append-only discussion and future target variants.
- Reuses the filesystem store and single-process write serialization.

## Decision

1. Store comments in `comments/<pullRequestId>.json` below the repository pull-request data directory.
2. Represent a comment target as a discriminated union. The initial variant is `{ type: "file", filePath }`; line targets can be added later.
3. Store UUID, target, plain-text body, author ID, author-name snapshot, and creation time for each comment.
4. Keep comments append-only. Editing, deletion, replies, and resolution are deferred.
5. Allow users with repository `read` permission to view and add comments.
6. Allow additions only while the pull request is open. Comments remain readable after merge or close.
7. Validate that the target path belongs to the current three-dot pull-request diff before appending.
8. Serialize appends with the existing per-PR in-process lock and write comment files through atomic rename.
9. Keep comments outside REST API v1 and access them through validated TanStack server functions.

## Consequences

- Multiple reviewers can build a persistent discussion for each changed file.
- Existing pull request files and REST responses remain compatible.
- Comments follow path identity: renamed files use the new path and deleted files use the old path.
- Comments for paths absent from an open pull request diff remain stored but are not displayed. Closed pull requests show them as archived discussion blocks so review history remains accessible.
- A future line-comment target can extend the union without migrating file-level comments.
- The filesystem representation will require migration when pull-request data moves to a database.
