# Task Boards

Borea provides organization-level Kanban task boards. Boards belong to an
organization, not to a repository, and can be used for planning work across one
or more repositories.

## Opening Tasks

Open an organization at `/organizations/<organization>`. The sidebar contains
two organization sections:

- **Repositories** for Git repositories.
- **Tasks** for Kanban task boards.

Select **Tasks** to open `/organizations/<organization>/tasks`.

## Creating a Board

Users with the `owner`, `administrator`, or `moderator` organization role can
create task boards.

1. Click **New board**.
2. Enter a board key, such as `TASK`.
3. Enter a board name and optional description.
4. Click **Create board**.

The board key is normalized to uppercase and is used in task IDs. A board with
the key `TASK` creates task IDs like `TASK-1` and `TASK-2`.

New boards start with four columns:

- `Backlog`
- `To do`
- `Doing`
- `Done`

## Managing Columns

Users who can manage tasks can add, rename, reorder, and delete columns.

Cards in a deleted column must be moved to another column. Select the target
column before deleting a non-empty column. The last column on a board cannot be
deleted.

## Working with Cards

Create cards from any column. In this release, a card contains:

- a public task ID;
- a title;
- a description;
- a column;
- a position in that column.

Use drag-and-drop to move cards between columns or reorder cards within the
same column. Borea stores the card's column and position after each move.

## Direct Task Links

Opening a card updates the URL to a direct task link:

```text
/organizations/<organization>/tasks/<boardKey>/<taskPublicId>
```

For example:

```text
/organizations/default/tasks/TASK/TASK-1
```

Opening that URL directly loads the board and opens the selected card.

## Access

All organization members can read task boards, columns, and cards.

Only `owner`, `administrator`, and `moderator` roles can create, update, move,
or delete boards, columns, and cards. Ordinary `member` users have read-only
access in the MVP.

NoAuth mode works with the fixed `default` organization and uses the existing
NoAuth access policy.
