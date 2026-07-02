# API Reference

Nirvana exposes a versioned REST API and the Git smart-HTTP protocol. REST
resources require a cookie session in the default full authentication mode.
Authentication endpoints and the OpenAPI document are public. In NoAuth mode,
REST requests use the fixed user without a login flow.

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
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

#### `POST /api/v1/auth/login`

Starts a session using `email` and `password`. Invalid credentials return
`401`.

#### `POST /api/v1/auth/logout`

Clears the current session and returns `204 No Content`.

#### `GET /api/v1/auth/me`

Returns the current user or `401`.

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

Git operations use `/api/git/<organization>/<repository>.git/`.
They remain public in this version, including push, and do not use the REST
cookie session. UI and REST repository roles do not yet protect these routes.
Future Git authentication will require `read` for upload-pack and `write` for
receive-pack.

### `GET /api/git/<organization>/<repository>.git/info/refs?service=<service>`

Advertises references for `git-upload-pack` or `git-receive-pack`.

### `POST /api/git/<organization>/<repository>.git/git-upload-pack`

Performs clone and fetch negotiation.

### `POST /api/git/<organization>/<repository>.git/git-receive-pack`

Performs push negotiation.

Clone and push examples:

```bash
git clone http://localhost:3000/api/git/default/example.git
git remote add origin http://localhost:3000/api/git/default/example.git
git push -u origin main
```

See `docs/git-http.md` for user guidance and `docs/security/noauth-mode.md` for NoAuth security implications.
