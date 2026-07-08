# ADR 0029: Organization Task Tracker

**Status:** Accepted
**Date:** 2026-07-08

## Context

Borea needs a Kanban-style task tracker for project planning. The existing
product model already has organizations, repository namespaces, organization
membership, repository access grants, and REST API v1. The task tracker must
fit the modular monolith architecture and remain deployable in the same Nitro
process.

The first release only needs boards, columns, and cards with direct task URLs.
It does not need assignees, labels, due dates, comments, repository links, or
workflow automation.

## Alternatives Considered

### Repository-owned boards

- **Pros:** Easy to inherit repository read/write permissions; familiar for
  Git-hosting products where issues belong to repositories.
- **Cons:** The requested sidebar entry is organization-level; future teams may
  need cross-repository boards; ordinary organization planning should not
  require a repository.

### Organization-owned boards

- **Pros:** Matches the organization sidebar requirement; supports cross-project
  boards; reuses organization membership; keeps repository permissions focused
  on Git resources.
- **Cons:** Requires task-specific write permission semantics instead of
  directly reusing repository `write`.

### External tracker integration

- **Pros:** Avoids building a tracker in Borea.
- **Cons:** Breaks the single-container MVP and does not provide the requested
  REST API.

## Decision

Implement task tracker boards as organization-owned resources.

Add a new `tasks` domain module with:

- Prisma models `TaskBoard`, `TaskColumn`, and `TaskCard`;
- UI routes under `/organizations/$organization/tasks`;
- REST API routes under
  `/api/v1/organizations/{organization}/task-boards`;
- OpenAPI registration through the shared API document;
- dnd-kit powered drag-and-drop for columns and cards.

Access is inherited from organization membership:

- all organization members can read task boards;
- `owner`, `administrator`, and `moderator` can manage boards, columns, and
  cards;
- ordinary `member` users are read-only in the MVP.

Task public IDs are board-scoped and generated as `<BOARD_KEY>-<NUMBER>`.
The number is monotonic and is not reused after card deletion.

## Consequences

### Positive

- Task boards work without requiring a repository.
- Organization-level planning can span multiple repositories.
- The access model stays consistent with existing organization roles.
- Direct task URLs are stable and human-readable.

### Negative

- Repository-specific issue tracking is out of scope for this release.
- The organization permission model gains a new `manageTasks` permission.
- Drag-and-drop adds `@dnd-kit` packages to the frontend dependency set.

### Neutral

- Future repository links can be added to cards without changing board
  ownership.
- Future task metadata such as assignees, labels, comments, and due dates can
  be added as separate tables or columns.
