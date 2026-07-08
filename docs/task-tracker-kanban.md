# Task Tracker Kanban

## Release Goal

The goal of this release is to add an organization-level task tracker based on the
Kanban methodology to Borea. The feature must allow teams inside an organization to
create task boards, manage columns, create task cards, and open each task using a
direct link.

In this release, the task tracker is part of the organization, not part of a repository.
Task boards must be available from the organization context next to the existing
repositories section and must provide a REST API similar to organizations,
repositories, and pull requests.

The release is considered successful if a user can:

- open the organization's task section from the sidebar;
- create a board with four default columns;
- add, rename, delete, and reorder columns;
- create a task card with a title and description;
- move a card between columns and change its order within a column;
- open a card so that the URL becomes a direct link to that task;
- perform the same basic operations through the REST API.

## Terms

**Task tracker** - a Borea module for managing organization tasks.

**Task board** - a Kanban board inside an organization. A board has a human-readable
key, a name, a set of columns, and a set of cards.

**Board key** - a short board identifier inside an organization. The key is used in
URLs and in public task IDs. For example, a board with the key `TASK` creates tasks
`TASK-1`, `TASK-2`.

**Column** - a vertical area of a Kanban board that represents a work stage. When a
board is created, the columns `Backlog`, `To do`, `Doing`, and `Done` are created
automatically.

**Task card** - a task on a board. In the MVP, a card contains a public ID, title,
description, column, and position within the column.

**Public task ID** - a human-readable unique card identifier in the
`<BOARD\_KEY>-<NUMBER>` format, for example `TASK-1`.

## Release Scope

The release includes a new `tasks` domain module that stores data in SQLite through
Prisma, provides server functions for the UI, REST API v1, and an OpenAPI description.

Task boards belong to an organization. A repository is not the owner of a board and
does not participate in the task tracker access model in the MVP.

Release functionality:

- organization board list;
- board creation, viewing, updating, and deletion;
- automatic creation of four columns when a board is created;
- adding, renaming, deleting, and reordering columns;
- creating, viewing, updating, deleting, and moving cards;
- direct URLs to task cards;
- REST API for boards, columns, and cards;
- OpenAPI 3.1 description of the new REST endpoints;
- browser-level E2E coverage of user scenarios.

## User Scenarios

### Opening the Tasks Section

1. The user opens an organization at `/organizations/<organization>`.
2. In the organization sidebar, the user sees the `Repositories` and `Tasks` items.
3. The user selects `Tasks`.
4. The application opens `/organizations/<organization>/tasks` and displays the list
   of task boards for this organization.

If the organization has no boards, the page displays an empty state and a board
creation button for users with permission to modify tasks.

### Creating a Board

1. The user clicks `New board`.
2. The user enters the board key, name, and optional description.
3. The application creates the board and automatically adds the columns:
   `Backlog`, `To do`, `Doing`, `Done`.
4. After successful creation, the user is redirected to the board page:
   `/organizations/<organization>/tasks/<boardKey>`.

The board key is normalized to uppercase and must be unique within the organization.

### Managing Columns

On the board page, a user with modification permission can:

- create a new column;
- rename an existing column;
- change the column order;
- delete a column.

When deleting a column that contains tasks, the user must select another column from
the same board. All tasks from the deleted column are moved to the selected column,
with their relative order preserved, and are placed after the tasks that already exist
in the target column.

The last column on a board cannot be deleted.

### Creating a Card

1. The user starts card creation in the selected column.
2. The user enters the required title and optional description.
3. The application creates the card in the selected column at the end of the list.
4. The card receives a public ID such as `TASK-1`.

The task number increases monotonically within the board. Deleting a card does not
reuse a previously issued number.

### Opening a Card by URL

When a card is opened, the application must update the URL to a direct link:

```text
/organizations/<organization>/tasks/<boardKey>/<taskPublicId>
```

Example:

```text
/organizations/default/tasks/TASK/TASK-1
```

Direct navigation to this URL must open the board page and immediately open the
corresponding card. If the card does not exist or is unavailable to the user, the page
must display a `404` error state.

### Moving Cards

A user with modification permission can:

- move a card between columns;
- change the order of cards within the same column;
- move a card to a specific position in the target column.

After moving a card, the application saves `columnId` and `position`. After a page
refresh, cards must be displayed in the saved order.

## UI and Routes

### Sidebar

In the organization context, the sidebar must support two main sections:

- `Repositories` - the existing organization repositories section;
- `Tasks` - the new organization task board section.

`Tasks` must be visible to users who have read access to the organization. When
`Tasks` is selected, the application navigates to the board list.

### UI Routes

Add the following routes:

```text
/organizations/$organization/tasks
/organizations/$organization/tasks/$boardKey
/organizations/$organization/tasks/$boardKey/$taskPublicId
```

The routes must follow the current TanStack Router file-based routing approach:
route files remain thin and delegate UI to domain module pages in
`src/modules/tasks/pages/`.

### Board List Page

The `/organizations/$organization/tasks` page displays:

- the task section heading;
- the list of organization boards;
- each board's name, key, and optional description;
- a board creation button for users with modification permission;
- an empty state if there are no boards.

### Board Page

The `/organizations/$organization/tasks/$boardKey` page displays:

- the board name;
- the board key;
- optional description;
- a horizontal Kanban layout with columns;
- cards inside columns;
- controls for managing the board, columns, and cards according to access rights.

A card can be opened in a modal or side panel. The selected UI pattern must preserve
the visibility of the board context and update the URL.

### Direct Card Link Page

The `/organizations/$organization/tasks/$boardKey/$taskPublicId` route uses the same
board page, but after loading the data it opens the card with the specified
`taskPublicId`.

Closing the card must return the URL to the board page:

```text
/organizations/$organization/tasks/$boardKey
```

## Access Model

The task tracker inherits the organization access model.

Read permissions:

- `owner`, `administrator`, `moderator`, and `member` can read organization boards,
  columns, and cards;
- a user without access to the organization receives `404` so that the existence of
  the resource is not disclosed.

Modification permissions:

- `owner`, `administrator`, and `moderator` can create, modify, and delete boards,
  columns, and cards;
- `member` has read-only access in the MVP.

NoAuth mode:

- uses a fixed user;
- must work with the `default` organization;
- does not require a separate permissions model on top of the existing NoAuth policy.

The implementation should extend organization permissions or add separate
task-specific checks without breaking the current `requireOrganizationPermissionFn`
model.

## Data Model

Add the Prisma models `TaskBoard`, `TaskColumn`, and `TaskCard`.

### TaskBoard

Purpose: stores an organization Kanban board.

Fields:

- `id String @id @default(uuid())`
- `organizationName String`
- `key String`
- `name String`
- `description String?`
- `lastTaskNumber Int @default(0)`
- `createdAt String`
- `updatedAt String`

Relations:

- `organization Organization @relation(fields: \[organizationName], references: \[name], onDelete: Cascade)`
- `columns TaskColumn\[]`
- `cards TaskCard\[]`

Constraints and indexes:

- uniqueness of `(organizationName, key)`;
- index by `organizationName`.

### TaskColumn

Purpose: stores a board column.

Fields:

- `id String @id @default(uuid())`
- `boardId String`
- `name String`
- `position Int`
- `createdAt String`
- `updatedAt String`

Relations:

- `board TaskBoard @relation(fields: \[boardId], references: \[id], onDelete: Cascade)`
- `cards TaskCard\[]`

Constraints and indexes:

- index by `(boardId, position)`;
- column names do not have to be unique within a board.

### TaskCard

Purpose: stores a task card.

Fields:

- `id String @id @default(uuid())`
- `boardId String`
- `columnId String`
- `publicId String`
- `number Int`
- `title String`
- `description String`
- `position Int`
- `createdAt String`
- `updatedAt String`

Relations:

- `board TaskBoard @relation(fields: \[boardId], references: \[id], onDelete: Cascade)`
- `column TaskColumn @relation(fields: \[columnId], references: \[id], onDelete: Cascade)`

Constraints and indexes:

- uniqueness of `(boardId, number)`;
- uniqueness of `(boardId, publicId)`;
- index by `(columnId, position)`;
- `publicId` is generated as `${board.key}-${number}`.

### Positions

`position` stores the order of columns and cards. Values must be deterministic
integers. After move operations, the service may normalize positions within the
affected collection so that the order remains dense and predictable.

## REST API

All endpoints are under `/api/v1` and use the existing error format:

```json
{
  "code": "not\_found",
  "message": "Task board \\"TASK\\" not found"
}
```

### Boards

#### `GET /api/v1/organizations/{organization}/task-boards`

Returns the list of organization boards available to the current user.

`200` response:

```json
\[
  {
    "id": "00000000-0000-4000-8000-000000000001",
    "organizationName": "default",
    "key": "TASK",
    "name": "Team tasks",
    "description": "Product delivery board",
    "createdAt": "2026-07-08T12:00:00.000Z",
    "updatedAt": "2026-07-08T12:00:00.000Z"
  }
]
```

#### `POST /api/v1/organizations/{organization}/task-boards`

Creates a board and four default columns.

Requires task modification permission.

Request body:

```json
{
  "key": "TASK",
  "name": "Team tasks",
  "description": "Product delivery board"
}
```

The `201` response contains the created board together with its columns.

#### `GET /api/v1/organizations/{organization}/task-boards/{boardKey}`

Returns the board, its columns, and its cards.

`200` response:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "organizationName": "default",
  "key": "TASK",
  "name": "Team tasks",
  "description": "Product delivery board",
  "columns": \[
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "name": "Backlog",
      "position": 0
    }
  ],
  "cards": \[
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "publicId": "TASK-1",
      "number": 1,
      "columnId": "00000000-0000-4000-8000-000000000002",
      "title": "Prepare release scope",
      "description": "",
      "position": 0
    }
  ],
  "createdAt": "2026-07-08T12:00:00.000Z",
  "updatedAt": "2026-07-08T12:00:00.000Z"
}
```

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}`

Updates the board name or description.

Request body:

```json
{
  "name": "Platform tasks",
  "description": "Platform team board"
}
```

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}`

Deletes the board together with its columns and cards. Returns `204 No Content`.

### Columns

#### `POST /api/v1/organizations/{organization}/task-boards/{boardKey}/columns`

Creates a column on the board.

Request body:

```json
{
  "name": "Review",
  "position": 2
}
```

If `position` is not provided, the column is added to the end.

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}`

Updates the column name and/or position.

Request body:

```json
{
  "name": "In review",
  "position": 3
}
```

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}`

Deletes a column. If the column contains cards, the request must pass
`targetColumnId`.

Request body:

```json
{
  "targetColumnId": "00000000-0000-4000-8000-000000000004"
}
```

The service moves the cards to the target column and then deletes the source column.

### Cards

#### `POST /api/v1/organizations/{organization}/task-boards/{boardKey}/cards`

Creates a card in a column.

Request body:

```json
{
  "columnId": "00000000-0000-4000-8000-000000000002",
  "title": "Prepare release scope",
  "description": "Write the initial task tracker specification"
}
```

The `201` response contains the created card with `publicId`.

#### `GET /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Returns a single card.

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Updates or moves a card.

Request body:

```json
{
  "title": "Prepare Kanban release scope",
  "description": "Update the technical specification",
  "columnId": "00000000-0000-4000-8000-000000000004",
  "position": 1
}
```

All fields are optional, but the request must contain at least one mutable field.

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Deletes a card. Returns `204 No Content`.

## OpenAPI

The new module must register OpenAPI schemas and paths through the shared generator
`src/openapi.ts`.

Add a separate registration function, for example `registerTaskOpenApi`, in the
`tasks` module. It must describe:

- request params for `organization`, `boardKey`, `columnId`, and `taskPublicId`;
- request bodies for creating and updating boards, columns, and cards;
- response schemas for the board list, board with columns and cards, column, card,
  and standard error;
- status codes `200`, `201`, `204`, `400`, `403`, `404`, and `409`.

The OpenAPI document `GET /api/v1/openapi.json` must include all new task tracker
endpoints.

## Validation and Errors

### Board Key Validation

The board key:

- is required;
- is normalized to uppercase;
- has a length from 1 to 20 characters;
- contains only Latin letters, digits, and hyphens;
- cannot start or end with a hyphen;
- is unique within the organization.

### Name Validation

Board name:

- is required;
- cannot be empty after trimming;
- has a maximum length of 100 characters.

Column name:

- is required;
- cannot be empty after trimming;
- has a maximum length of 100 characters.

Card title:

- is required;
- cannot be empty after trimming;
- has a maximum length of 200 characters.

Board and card descriptions:

- are optional;
- may be empty after trimming;
- have a maximum length of 5000 characters for cards;
- have a maximum length of 500 characters for boards.

### Errors

`400 Bad Request`:

- invalid path params;
- invalid request body;
- attempt to delete the last column;
- attempt to delete a non-empty column without `targetColumnId`;
- `targetColumnId` is the same as the column being deleted.

`403 Forbidden`:

- the user can see the organization but does not have permission to modify the resource.

`404 Not Found`:

- the organization does not exist or is unavailable to the user;
- the board does not exist;
- the column does not exist or does not belong to the board;
- the card does not exist or does not belong to the board.

`409 Conflict`:

- a board with this key already exists in the organization;
- a move operation references stale or conflicting state;
- the public task ID conflicts with an existing card.

## Integration with the Existing Architecture

The task tracker must follow the current Borea architecture:

- the new domain is placed in `src/modules/tasks/`;
- public exports go through `src/modules/tasks/index.ts`;
- route files in `src/routes/` remain thin;
- REST route files in `src/routes/api/v1/` delegate handling to server functions
  and `handleApiRequest`;
- validation is performed through Zod v4;
- data is stored through Prisma and SQLite;
- OpenAPI is generated through `@asteasolutions/zod-to-openapi`;
- the UI is built with React, TanStack Router, and Mantine;
- icons are taken from `lucide-react`;
- UI texts are added to `messages/{locale}.json` and used through Paraglide.

Because this release adds a new domain module and new database tables, an ADR is
required before implementation. The ADR must describe:

- why the task tracker is an organization resource;
- the data model;
- the permissions model;
- the URL and API namespace;
- MVP limitations.

After adding or removing routes, run `npm run generate-routes` and do not edit
`src/routeTree.gen.ts` manually.

## Testing

### Unit Tests

Cover the following with unit tests:

- Zod schemas for board creation and update;
- `boardKey` normalization and validation;
- task `publicId` generation;
- default column creation;
- preventing deletion of the last column;
- moving tasks when deleting a column;
- recalculating `position` when moving columns;
- recalculating `position` when moving cards within a column;
- recalculating `position` when moving a card between columns.

### Integration Tests

Cover the following with integration tests:

- creating a board with default columns in the Prisma store/service;
- uniqueness of `boardKey` within an organization;
- independence of identical `boardKey` values in different organizations;
- monotonic `lastTaskNumber`;
- cascade deletion of a board, columns, and cards;
- cascade deletion of task tracker data when an organization is deleted;
- access rights enforcement for `owner`, `administrator`, `moderator`, `member`,
  and outsider;
- NoAuth scenario for the `default` organization.

### REST API Tests

Cover the following with API tests:

- board CRUD;
- column CRUD;
- card CRUD;
- opening a card by `taskPublicId`;
- moving a card between columns through `PATCH`;
- deleting a column with task migration;
- `400`, `403`, `404`, and `409` responses;
- presence of the new endpoints in `/api/v1/openapi.json`.

### E2E Tests

Cover the following with Playwright E2E tests:

- the `Tasks` item is displayed in the organization sidebar;
- the user opens `/organizations/<organization>/tasks`;
- the user creates a board;
- the new board contains `Backlog`, `To do`, `Doing`, and `Done`;
- the user creates a card;
- opening the card changes the URL to the direct link;
- the direct URL opens the board with the card opened;
- the user moves a card between columns;
- the user changes the order of cards;
- the user deletes a column and moves tasks to another column;
- a regular `member` can see the board but does not see modification controls.

### Required Checks Before Completing the Implementation

Before completing the implementation, run:

```bash
npm run check
npx tsc --noEmit
npm run test
npm run test:integration
npm run generate-routes
```

Also run targeted Playwright tests for the task tracker. A full `npm run test:e2e`
is desirable before the release, but targeted E2E coverage of the changed
functionality is sufficient for completing the task.

## Documentation

Because this is a user-facing feature, the implementation must update the
documentation:

- add a user document for the task tracker, for example `docs/tasks.md`;
- add a link to it in `docs/README.md`;
- update `docs/API.md` with the description of the new REST endpoints;
- add an ADR to `docs/ADR/` and a link in `docs/ADR/README.md`.

The documentation must explicitly state that boards belong to an organization, not
a repository, and that a regular organization member has read-only access in the MVP.

## Out of Scope for the Release

The MVP does not include:

- assignees;
- labels;
- due dates;
- comments in tasks;
- attachments;
- checklists/subtasks;
- search and filtering;
- WIP limits;
- workflow automation;
- links between tasks and commits, branches, pull requests, or repositories;
- repository-level task boards;
- notifications;
- audit log;
- board import and export;
- real-time collaborative editing;
- optimistic locking as a separate user-facing feature.

These capabilities can be added in future releases without changing the basic model:
organization -> board -> column -> card.

## Acceptance Criteria

The release is accepted if all conditions are met:

- the organization has a `Tasks` section in the sidebar;
- `/organizations/<organization>/tasks` displays the board list;
- a user with the `owner`, `administrator`, or `moderator` role can create a board;
- a new board automatically contains the `Backlog`, `To do`, `Doing`, and `Done`
  columns;
- a user with modification permission can add, rename, reorder, and delete a column;
- deleting a non-empty column requires selecting a target column and moves the tasks;
- a user with modification permission can create a card with a title and description;
- the card receives a public ID in the `<BOARD\_KEY>-<NUMBER>` format;
- opening the card changes the URL to the direct link;
- the direct URL opens the board with the selected card;
- the card can be moved between columns and reordered;
- the REST API covers CRUD for boards, columns, and cards;
- the OpenAPI document contains the new endpoints;
- `member` can read boards but cannot modify them;
- an outsider receives `404` for unavailable task tracker resources;
- NoAuth mode works for the `default` organization;
- tests from the "Testing" section are added and pass;
- documentation and ADR are updated before release implementation.
