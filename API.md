# API Reference

Nirvana exposes a versioned REST API and the Git smart-HTTP protocol. No authentication is required in the current NoAuth mode.

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
- `404` — repository or pull request not found
- `409` — pull request state or merge conflict
- `500` — unexpected server error

The OpenAPI 3.1 document is available from `GET /api/v1/openapi.json`.

### Repositories

#### `GET /api/v1/organizations`

Lists organizations visible in the active organization mode.

#### `POST /api/v1/organizations`

Creates an organization in multi mode. Returns `409` in single mode.

#### `GET /api/v1/organizations/{organization}`

Returns one organization.

#### `GET /api/v1/organizations/{organization}/repositories`

Returns all repositories ordered by creation time, newest first.

```json
[
  {
    "name": "example",
    "description": "Example repository",
    "createdAt": "2026-07-02T12:00:00.000Z"
  }
]
```

#### `GET /api/v1/organizations/{organization}/repositories/{repository}`

Returns one repository or `404` when it does not exist.

#### `DELETE /api/v1/organizations/{organization}/repositories/{repository}`

Deletes the Git repository and its stored pull requests. Returns `204 No Content`.

```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/default/repositories/example
```

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
