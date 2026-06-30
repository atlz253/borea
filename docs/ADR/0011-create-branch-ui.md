# ADR 0011: Create Branch from UI

## Context

The repository page has a branch switcher dropdown that lists all branches and allows switching between them. Users need the ability to create new branches directly from the web UI without using the Git CLI.

The creation flow requires:
1. A Git provider method to create branches (`git branch <name> [<from>]` on the bare repo).
2. A server function (POST) to accept the creation request.
3. A UI entry point in the branch switcher menu.
4. Branch name validation against Git ref naming rules.

## Alternatives

### 1. REST endpoint under `/api/git/`

Add a `POST /api/git/<name>.git/create-branch` endpoint alongside the existing smart-HTTP endpoints. This follows RESTful URL conventions.

- Pro: consistent with existing API structure.
- Con: adds a non-smart-HTTP route to the git smart-HTTP path; requires separate route handling for two different protocols on the same path prefix.

### 2. TanStack Server Function (chosen)

Use `createServerFn({ method: "POST" })` with a Zod-validated schema, invoked directly from the component.

- Pro: no REST endpoint needed — the server function is auto-wired by TanStack Start; no route path conflicts.
- Pro: Zod validation on both client and server side.
- Pro: the branch is created via `CliGitProvider.createBranch()` which calls `git branch` CLI, consistent with the existing provider pattern.
- Con: no discoverable REST API for external clients (acceptable for MVP; REST can be added later).

### 3. Inline modal with no "from" selector (chosen)

The modal has a single text input for the branch name. The "from" ref is automatically set to the currently selected branch.

- Pro: minimal UI, fast flow.
- Con: no ability to fork from a different commit/branch.
- Decision: adequate for MVP; the "from" selector can be added later as a dropdown of branches.

## Decision

- Use `createServerFn` (TanStack Start) for the creation endpoint.
- Add `createBranch` to the `GitProvider` interface and implement it in `CliGitProvider` via `git branch <name> [<from>]`.
- Add a "New branch" item at the bottom of the BranchSwitcher menu, separated by a divider.
- Clicking "New branch" opens a Mantine `Modal` with a single text input for the branch name.
- The "from" ref defaults to the currently selected branch (not configurable by the user).
- Branch creation navigates to the new branch immediately.
- On error, the error message is displayed in the modal.
- Branch name validation is performed by a Zod schema (`branchNameSchema`) that rejects spaces, `~`, `^`, `:`, `?`, `*`, `[`, `\`, `..`, leading `-`, `.lock` suffix, and `@{`.

## Consequences

- The GitProvider interface gains a new `createBranch` method that all provider implementations must support.
- The BranchSwitcher component is always rendered (even for repos with 1 branch) so the "New branch" option is available.
- The modal uses `withinPortal={false}` to ensure testability in jsdom (transition animation may delay content).
- Branch names containing `/` are URL-encoded as `%2F` when navigating to the new branch, matching the existing convention from ADR 0010.
- The `createBranchFn` is exported through the module barrel (`#/modules/repositories`), so the Barrel Rule (ADR 0003) is not violated.
