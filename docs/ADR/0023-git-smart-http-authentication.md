# ADR 0023: Git Smart-HTTP Authentication

**Status:** Accepted
**Date:** 2026-07-03
**Author:** Architecture Team

## Context

ADR 0021 introduced repository roles but deliberately left Git smart-HTTP
public until a credentials mechanism was selected. Cookie sessions are not
suitable for command-line Git clients, while accepting account passwords would
expose the primary account credential to Git credential helpers.

## Decision

1. Full authentication mode requires a personal access token for every
   smart-HTTP request. Tokens are accepted only through HTTP Basic
   authentication as the password; the non-empty username is not used for
   identity lookup.
2. Tokens authenticate only Git smart-HTTP. REST API authentication remains
   cookie-session based.
3. Tokens have a user-provided name, no scopes, no expiration, and remain valid
   until revoked. Current repository permissions are evaluated for every Git
   request.
4. Token plaintext contains a random 256-bit secret and is returned only once.
   Storage contains the token identifier, owner, metadata, and SHA-256 secret
   hash. Secret comparison is constant-time.
5. `git-upload-pack` requires repository `read`; `git-receive-pack` requires
   `write`. These checks apply to both reference advertisement and service POST
   requests.
6. Missing or invalid credentials return `401` with a Basic challenge.
   Inaccessible repositories return `404`; authenticated read-only users
   attempting push receive `403`.
7. NoAuth mode retains credential-free Git access and does not allow token
   management.

## Consequences

- The public Git behavior in ADR 0021 is superseded in full mode.
- Token revocation and repository role changes take effect on the next Git
  request.
- Git clients can use standard credential helpers without exposing account
  passwords.
- Deployments must terminate HTTPS before accepting tokens outside local
  development because HTTP Basic does not encrypt credentials.
