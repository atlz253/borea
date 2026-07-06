# ADR 0024: Branch Rename

## Context

Users need to rename existing branches directly from the web UI. The branch switcher already supports creating new branches (ADR 0011) and switching between them, but renaming required using the Git CLI. This adds an in-UI rename flow with the same validation rules as branch creation.

The rename flow requires:
1. A Git provider method to rename branches (`git branch -m <old> <new>` on the bare repo).
2. A server function (POST) to accept the rename request.
3. A UI entry point in the branch switcher menu.
4. Validation that the old branch exists, the new name is valid, and no branch with the new name already exists.

## Alternatives

### 1. REST endpoint under `/api/v1/`

Add a `POST /api/v1/organizations/{org}/repositories/{repo}/branches/rename` REST endpoint.

- Pro: discoverable via the OpenAPI document; usable by external clients and scripts.
- Con: requires a separate route file and validator layer; the existing branch operations (create) use server functions, not REST.

### 2. TanStack Server Function (chosen)

Use `createServerFn({ method: "POST" })` with a Zod-validated schema, invoked directly from the component.

- Pro: consistent with the existing `createBranchFn` pattern (ADR 0011).
- Pro: no REST endpoint needed — the server function is auto-wired by TanStack Start; no route path conflicts.
- Pro: Zod validation on both client and server side.
- Pro: the branch is renamed via `CliGitProvider.renameBranch()` which calls `git branch -m` CLI, consistent with the existing provider pattern.
- Con: no discoverable REST API for external clients.

### 3. REST endpoint alongside server function

Expose both a server function for the UI and a REST endpoint for external clients.

- Pro: best of both worlds.
- Con: duplicates validation and error handling; adds maintenance burden for MVP.
- Decision: REST can be added later if external clients need it.

## Decision

- Use `createServerFn` (TanStack Start) for the rename endpoint, consistent with ADR 0011.
- Add `renameBranch` to the `GitProvider` interface and implement it in `CliGitProvider` via `git branch -m <old> <new>`. The implementation is extracted to `cli-git-helpers.ts` to keep `cli-git-provider.ts` under the 600-line Biome limit.
- Add a "Rename branch" item at the bottom of the BranchSwitcher menu, separated by a divider (below "New branch").
- Clicking "Rename branch" opens a Mantine `Modal` with the current branch name pre-filled and a single text input for the new name.
- On success, the page navigates to the new branch's tree view.
- On error (branch not found, new name already exists, validation failure), the error message is displayed in the modal.
- Branch name validation uses a dedicated `renameBranchSchema` (Zod) with the same rules as branch creation: 1–255 characters, no spaces, `~`, `^`, `:`, `?`, `*`, `[`, `\`, `..`, leading `-`, `.lock` suffix, or `@{`.

## Consequences

- The GitProvider interface gains a new `renameBranch` method that all provider implementations must support.
- The BranchSwitcher component gains a "Rename branch" menu item alongside "New branch".
- The `renameBranchFn` is exported through the module barrel (`#/modules/repositories`), so the Barrel Rule (ADR 0003) is not violated.
- The rename helper in `cli-git-helpers.ts` is reused by the provider, keeping the implementation DRY.
- The REST API does not expose branch rename — external clients must use the Git smart-HTTP protocol or a future REST addition.
- The `repository.service.ts` gains a `renameRepositoryBranch` function that validates repository existence before delegating to the Git provider.
