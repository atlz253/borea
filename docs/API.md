# API Reference

Borea exposes a versioned REST API and the Git smart-HTTP protocol. REST
resources require a cookie session in the default full authentication mode.
Registration, login, and the OpenAPI document are public. Current-user and
token-management endpoints require a cookie session. In NoAuth mode, REST
requests use the fixed user without a login flow.

## REST API v1

The base path is `/api/v1`. Successful responses contain resources directly. JSON errors have this shape:

```json
{
  "code": "not_found",
  "message": "Repository \"example\" not found"
}
```

Validation errors can include a `details` field. Status codes are:

- `400` — invalid path parameters or JSON body
- `401` — authentication is required or credentials are invalid
- `403` — authenticated user lacks permission for a visible resource
- `404` — repository or pull request not found
- `409` — pull request state or merge conflict
- `500` — unexpected server error

The OpenAPI 3.1 document is available from `GET /api/v1/openapi.json`.

### Authentication

#### `POST /api/v1/auth/register`

Creates a user and starts a seven-day cookie session.

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

User responses contain `id`, `username`, `email`, and `createdAt`. There is no
separate display-name field; `username` is the display identity and URL
namespace.

#### `POST /api/v1/auth/login`

Starts a session using `email` and `password`. Invalid credentials return
`401`.

#### `POST /api/v1/auth/logout`

Clears the current session and returns `204 No Content`.

#### `GET /api/v1/auth/me`

Returns the current user or `401`.

#### `GET /api/v1/auth/git-tokens`

Returns the current user's Git token metadata. Token secrets are never listed.
Returns `403` in NoAuth mode.

#### `POST /api/v1/auth/git-tokens`

Creates a Git personal access token:

```json
{
  "name": "Work laptop"
}
```

Returns `201` with `id`, `name`, `createdAt`, and the one-time `token` value.
The token cannot be retrieved again.

#### `DELETE /api/v1/auth/git-tokens/{tokenId}`

Revokes a token owned by the current user and returns `204`. Revoking an
unknown token or another user's token is idempotent and does not disclose it.

### Repositories

#### `GET /api/v1/organizations`

Lists organizations where the current user is a member. NoAuth returns all
organizations.

#### `POST /api/v1/organizations`

Creates an organization with the current user as its `owner`. Returns
`409` in NoAuth single mode.

#### `GET /api/v1/organizations/{organization}`

Returns one organization.

#### `PATCH /api/v1/organizations/{organization}`

Updates the organization description. Available to the `owner` and
`administrator`.

#### `DELETE /api/v1/organizations/{organization}`

Deletes the organization, its repositories, pull requests, and access metadata.
Only the `owner` can use this endpoint.

#### `GET /api/v1/organizations/{organization}/members`

Returns public profiles and lowercase organization roles for all members.
Organization members can list this resource; outsiders receive `404`.

#### `POST /api/v1/organizations/{organization}/members`

Adds an already registered user with the `member` role. The `owner`,
administrators, and moderators can call this endpoint.

```json
{
  "email": "bob@example.com"
}
```

Returns the added public user with status `201`. An unknown email returns
`404`; adding an existing member returns `409`.

#### `PATCH /api/v1/organizations/{organization}/members/{userId}`

Changes an organization role:

```json
{
  "role": "moderator"
}
```

The `owner` can assign `member`, `moderator`, or `administrator`. Assigning
`owner` transfers ownership and changes the previous owner to `member`.
Administrators can switch ordinary members between `member` and `moderator`.

#### `DELETE /api/v1/organizations/{organization}/members/{userId}`

Removes a member according to the organization role hierarchy and revokes their
repository grants. Repository owners cannot be removed and return `409`.

#### `GET /api/v1/organizations/{organization}/repositories`

Returns repositories visible to the current user, ordered by creation time,
newest first. Organization owners, administrators, and moderators see all
repositories. Ordinary members need a repository grant.

```json
[
  {
    "name": "example",
    "description": "Example repository",
    "createdAt": "2026-07-02T12:00:00.000Z",
    "ownerId": "00000000-0000-4000-8000-000000000001"
  }
]
```

#### `GET /api/v1/users/{username}/repositories`

Returns personal repositories owned by the requested user. A user can only list
their own personal repositories.

#### `POST /api/v1/users/{username}/repositories`

Creates a personal repository for the authenticated user:

```json
{
  "name": "example",
  "description": "Personal repository"
}
```

Returns `201` with repository data. Creating a repository for another username
returns `403`.

#### `GET /api/v1/users/{username}/repositories/{repository}`

Returns one personal repository or `404` when it does not exist or belongs to a
different user.

#### `DELETE /api/v1/users/{username}/repositories/{repository}`

Deletes a personal repository owned by the authenticated user and returns
`204 No Content`.

#### `GET /api/v1/organizations/{organization}/repositories/{repository}`

Returns one repository or `404` when it does not exist.

#### `DELETE /api/v1/organizations/{organization}/repositories/{repository}`

Deletes the Git repository and its stored pull requests. Returns `204 No Content`.
Available to the repository owner and privileged organization roles.

```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/default/repositories/example
```

#### `GET /api/v1/organizations/{organization}/repositories/{repository}/members`

Returns explicit repository grants. Requires repository access-management
permission.

#### `PUT /api/v1/organizations/{organization}/repositories/{repository}/members/{userId}`

Creates or replaces an explicit grant for an ordinary organization member:

```json
{
  "role": "write"
}
```

Repository roles are `read`, `write`, and `moderator`. Repository moderators
can assign only `read` and `write`.

#### `DELETE /api/v1/organizations/{organization}/repositories/{repository}/members/{userId}`

Revokes an explicit repository grant. Repository moderators cannot revoke a
`moderator` grant.

#### `POST /api/v1/organizations/{organization}/repositories/{repository}/branches/rename`

Renames a branch. Requires `write` access to the repository.

```json
{
  "oldName": "old-branch",
  "newName": "new-branch"
}
```

Returns the updated branch info:

```json
{
  "name": "new-branch",
  "isHead": false
}
```

Returns `404` when the repository or the old branch does not exist. Returns
`409` when a branch with the new name already exists.

### Task boards

Task boards are organization-level Kanban boards. All organization members can
read boards. Organization owners, administrators, and moderators can create and
modify boards, columns, and cards. Ordinary members have read-only access.

#### `GET /api/v1/organizations/{organization}/task-boards`

Returns all task boards in the organization.

#### `POST /api/v1/organizations/{organization}/task-boards`

Creates a board and the default `Backlog`, `To do`, `Doing`, and `Done`
columns:

```json
{
  "key": "TASK",
  "name": "Team tasks",
  "description": "Product delivery board"
}
```

The board key is normalized to uppercase and must be unique in the
organization. Duplicate keys return `409`.

#### `GET /api/v1/organizations/{organization}/task-boards/{boardKey}`

Returns one board with its columns and cards:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "organizationName": "default",
  "key": "TASK",
  "name": "Team tasks",
  "description": "Product delivery board",
  "lastTaskNumber": 1,
  "columns": [
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "boardId": "00000000-0000-4000-8000-000000000001",
      "name": "Backlog",
      "position": 0,
      "createdAt": "2026-07-08T12:00:00.000Z",
      "updatedAt": "2026-07-08T12:00:00.000Z"
    }
  ],
  "cards": [
    {
      "id": "00000000-0000-4000-8000-000000000003",
      "boardId": "00000000-0000-4000-8000-000000000001",
      "columnId": "00000000-0000-4000-8000-000000000002",
      "publicId": "TASK-1",
      "number": 1,
      "title": "Prepare release scope",
      "description": "",
      "position": 0,
      "createdAt": "2026-07-08T12:00:00.000Z",
      "updatedAt": "2026-07-08T12:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-08T12:00:00.000Z",
  "updatedAt": "2026-07-08T12:00:00.000Z"
}
```

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}`

Updates the board name or description:

```json
{
  "name": "Platform tasks",
  "description": "Platform team board"
}
```

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}`

Deletes the board, its columns, and its cards. Returns `204 No Content`.

#### `POST /api/v1/organizations/{organization}/task-boards/{boardKey}/columns`

Creates a column:

```json
{
  "name": "Review",
  "position": 2
}
```

When `position` is omitted, the column is appended to the end.

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}`

Renames or reorders a column:

```json
{
  "name": "In review",
  "position": 3
}
```

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}/columns/{columnId}`

Deletes a column. Non-empty columns require a target column for moved cards:

```json
{
  "targetColumnId": "00000000-0000-4000-8000-000000000004"
}
```

Deleting the last column or deleting a non-empty column without a target returns
`400`.

#### `POST /api/v1/organizations/{organization}/task-boards/{boardKey}/cards`

Creates a card in a column:

```json
{
  "columnId": "00000000-0000-4000-8000-000000000002",
  "title": "Prepare release scope",
  "description": "Write the initial task tracker specification"
}
```

The response contains a public ID such as `TASK-1`.

#### `GET /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Returns one card by its public task ID.

#### `PATCH /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Updates or moves a card:

```json
{
  "title": "Prepare Kanban release scope",
  "description": "Update the technical specification",
  "columnId": "00000000-0000-4000-8000-000000000004",
  "position": 1
}
```

#### `DELETE /api/v1/organizations/{organization}/task-boards/{boardKey}/cards/{taskPublicId}`

Deletes a card. Returns `204 No Content`.

### Pull requests

#### `GET /api/v1/organizations/{organization}/repositories/{repository}/pull-requests`

Returns all pull requests for the repository. A missing repository returns `404`; a repository without pull requests returns an empty array.

#### `GET /api/v1/organizations/{organization}/repositories/{repository}/pull-requests/{pullId}`

Returns one pull request or `404`.

#### `POST /api/v1/organizations/{organization}/repositories/{repository}/pull-requests/{pullId}/merge`

Merges an open pull request. The optional JSON body selects fast-forward when the histories allow it:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"fastForward":true}' \
  http://localhost:3000/api/v1/organizations/default/repositories/example/pull-requests/1/merge
```

An omitted body uses the default merge-commit strategy. The response contains the updated pull request and merge result:

```json
{
  "pullRequest": {
    "id": 1,
    "organizationName": "default",
    "repoName": "example",
    "title": "Add feature",
    "sourceBranch": "feature",
    "targetBranch": "main",
    "status": "merged",
    "mergeCommitSha": "0123456789abcdef",
    "authorName": "anonymous",
    "viewedFiles": [],
    "createdAt": "2026-07-02T12:00:00.000Z",
    "updatedAt": "2026-07-02T12:05:00.000Z"
  },
  "mergeResult": {
    "mergedSha": "0123456789abcdef",
    "fastForward": true
  }
}
```

Merge conflicts and attempts to merge a closed or already merged pull request return `409`.

## Git Smart-HTTP

Git operations use `/api/git/<organization>/<repository>.git/` for
organization repositories and `/api/git/users/<username>/<repository>.git/` for
personal repositories.
Full mode requires HTTP Basic authentication with a Git personal access token
as the password. The username must be non-empty but is not used for identity
lookup. REST cookie sessions and account passwords are not accepted.

`git-upload-pack` requires repository `read`; `git-receive-pack` requires
`write`. Missing or invalid credentials return `401` with
`WWW-Authenticate: Basic realm="Borea Git"`. Inaccessible repositories
return `404`, and authenticated readers attempting push receive `403`. NoAuth
mode remains credential-free.

### `GET /api/git/<organization>/<repository>.git/info/refs?service=<service>`

Advertises references for `git-upload-pack` or `git-receive-pack`.

### `POST /api/git/<organization>/<repository>.git/git-upload-pack`

Performs clone and fetch negotiation.

### `POST /api/git/<organization>/<repository>.git/git-receive-pack`

Performs push negotiation.

Clone and push examples:

```bash
git clone https://alice%40example.com@example.test/api/git/default/example.git
git remote add origin https://alice%40example.com@example.test/api/git/default/example.git
git push -u origin main
```

Personal repository example:

```bash
git clone https://alice%40example.com@example.test/api/git/users/alice/example.git
```

Git prompts for the PAT as the password. Use HTTPS and a Git credential helper;
do not embed the token in the URL. See `docs/git-http.md` for user guidance and
`docs/security/noauth-mode.md` for NoAuth security implications.
