# ADR 0019: File Authentication and Organization Ownership

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Architecture Team

Organization ownership in this decision is superseded by equal membership in
ADR 0020. The authentication and session decisions remain active.

## Context

Borea currently exposes an empty `AuthProvider` contract and treats every
request as authenticated. Organizations have no owner, so every user would see
the same organization list after account support is introduced.

The first authenticated version must remain deployable as one process without
a database while preserving NoAuth for development and existing automated
tests.

## Decision

1. `AUTH_MODE=full` is the default. `AUTH_MODE=noauth` explicitly enables the
   fixed development user.
2. Full authentication uses a module-owned file user store. Passwords are
   stored as versioned salted scrypt credentials.
3. Authentication state is an encrypted, HTTP-only, seven-day cookie session
   containing only the user ID.
4. Full mode requires `SESSION_SECRET` of at least 32 characters.
5. UI routes and REST API resources require authentication. Authentication
   endpoints and the OpenAPI document remain public.
6. Organizations have an internal optional `ownerId`. Full mode exposes only
   organizations owned by the current user. Ownerless legacy organizations are
   hidden.
7. NoAuth bypasses organization ownership and remains compatible with
   ownerless data.
8. Full authentication cannot be combined with single-organization mode.
9. Git smart-HTTP remains public in this iteration.

## Storage Layout

```text
data/
  users/<sha256-normalized-email>.json
  organizations/<organization>/organization.json
```

## Consequences

- Registration and login work without adding a database or a separate service.
- Organization names remain globally unique even though visibility is
  owner-scoped.
- Changing the session secret invalidates every active session.
- Data created in NoAuth remains ownerless and is hidden after switching to
  full mode.
- Public Git smart-HTTP must not be used for confidential repositories.

## Future Work

1. Add public and private repositories with explicit read, write, and
   visibility rules.
2. Add Git smart-HTTP authentication for clone, fetch, and push. Select a
   credentials or access-token mechanism and enforce access to private
   repositories.
