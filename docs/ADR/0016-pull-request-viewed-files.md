# ADR 0016: Pull Request Viewed Files

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Architecture Team

## Context

The Files changed tab displays pull request diffs but does not let a reviewer track which files have been inspected. The MVP currently runs with a single NoAuth identity and stores pull request metadata as JSON files.

The first code-review increment needs a persistent `Viewed` checkbox per changed file. Marking a file must collapse its diff, and the state must survive page reloads.

## Decision

1. Store reviewed file paths in `PullRequest.viewedFiles: string[]`.
2. Use `newPath ?? oldPath` as the file identifier. Renamed files use the new path and deleted files use the old path.
3. Treat viewed state as shared by the single NoAuth user. Per-user review state is deferred until `AuthProvider` provides real user identities.
4. Update viewed state through a validated POST TanStack server function.
5. Verify that the requested path belongs to the current three-dot pull request diff before persisting it.
6. Serialize writes per pull request inside the single Nitro process and retain atomic temp-file rename.
7. Normalize existing pull request JSON files that do not contain `viewedFiles` to an empty array.
8. Keep `SplitDiffView` domain-neutral by exposing controlled collapse and header-action props.

## Consequences

- Viewed state survives navigation, reloads, and process restarts.
- Existing pull request data remains readable without a migration command.
- Concurrent changes to different file marks do not overwrite each other within the supported single-process deployment.
- A path remains viewed when its contents change because the state is path-based.
- The JSON representation will require migration when multi-user authentication is introduced.

