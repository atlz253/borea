# API Reference

Nirvana currently exposes a Git smart-HTTP API for repository operations. A REST API with OpenAPI specification is planned for future versions.

## Git Smart-HTTP

All Git operations go through the endpoint `/api/git/<name>.git/`, where `<name>` is the repository name displayed in the Nirvana web interface (without `.git` suffix).

### Endpoints

#### `GET /api/git/<name>.git/info/refs?service=<service>`

Returns the advertisement of available references (branches, tags, HEAD) for the specified service.

Query parameters:
- `service` — `git-upload-pack` (for clone/fetch) or `git-receive-pack` (for push)

Response:
- `Content-Type: application/x-git-<service>-advertisement`
- Body in pkt-line format
- Status `404` if the repository does not exist

#### `POST /api/git/<name>.git/git-upload-pack`

Performs the upload-pack negotiation (used by `git fetch` and `git clone`).

Request:
- Body: binary pkt-line data from the Git client
- Supports `Content-Encoding: gzip`

Response:
- `Content-Type: application/x-git-upload-pack-result`
- Binary pkt-line data (packfile)

#### `POST /api/git/<name>.git/git-receive-pack`

Performs the receive-pack negotiation (used by `git push`).

Request:
- Body: binary pkt-line data from the Git client
- Supports `Content-Encoding: gzip`

Response:
- `Content-Type: application/x-git-receive-pack-result`
- Binary pkt-line data (status report)

### Usage Examples

Clone a repository:
```bash
git clone http://localhost:3000/api/git/my-project.git
```

Push to a repository:
```bash
git remote add origin http://localhost:3000/api/git/my-project.git
git push -u origin main
```

### Note

The Git smart-HTTP protocol is the standard early-implementation protocol used by Gitea, Forgejo, GitLab and other self-hosted Git platforms. No authentication is required in the current MVP (NoAuth mode). See `docs/git-http.md` for user guidance and `docs/security/noauth-mode.md` for security implications.

## Planned

A REST API with OpenAPI specification (based on Zod schemas and `@asteasolutions/zod-to-openapi`) is planned per ADR 0001. It will cover repository creation, pull requests, code review, and other operations.
