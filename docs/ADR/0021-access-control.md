# ADR 0021: Organization and Repository Access Control

**Status:** Accepted
**Date:** 2026-07-03
**Author:** Architecture Team

## Context

ADR 0020 introduced equal organization membership. Equal members can currently
invite users and access every repository, which does not provide the isolation
required for private team repositories.

Git smart-HTTP still has no credentials suitable for Git clients. Web sessions
can protect the UI and REST API, but cannot yet authorize clone, fetch, or push.

## Decision

1. Organization roles are `owner`, `administrator`, `moderator`, and `member`.
2. Repository roles are `read`, `write`, and `moderator`. Role values are
   lowercase in TypeScript, stored JSON, and REST payloads.
3. An organization has exactly one owner. Assigning `owner` to another member
   transfers ownership and changes the previous owner to `member`.
4. Organization administrators manage settings and member roles up to
   `moderator`. Organization moderators manage ordinary members. Both roles can
   create repositories and have full access to every organization repository.
5. A repository creator is stored as `ownerId`. The repository owner,
   organization owner, administrators, and organization moderators can manage
   all repository access. Repository moderators can manage only `read` and
   `write` grants.
6. `read` permits viewing. `write` additionally permits branch creation, pull
   request creation and merge, and viewed-file updates.
7. Repository grants are available only to organization members. Removing an
   organization member removes their grants. A repository owner cannot be
   removed from the organization.
8. Unknown or inaccessible resources return `404`. Authenticated users lacking
   an action on a visible resource receive `403`.
9. Full mode enforces access in UI server functions and REST routes. NoAuth
   bypasses access checks and does not expose membership management.
10. Git smart-HTTP authentication is defined by ADR 0023. Full mode requires a
    personal access token, `read` for upload-pack, and `write` for receive-pack.
11. Existing ADR 0020 data is not migrated. Access control starts with a new
    data directory and accepts only the new storage format.

## Storage Layout

```text
data/organizations/<organization>/
  organization.json
  members/<userId>.json
  repositories/<repository>/
    repository.json
    members/<userId>.json
```

Organization metadata contains its `ownerId`. Repository metadata contains the
creator `ownerId`. Membership and grant files contain their lowercase role and
timestamps.

## Consequences

- ADR 0020 is superseded for membership privileges and stored member records.
- Repository lists no longer disclose repositories without effective read
  access.
- Access metadata and Git repository creation are coordinated; failed access
  initialization removes the new Git repository.
- Organization deletion cascades through pull request data, Git repositories,
  access metadata, and organization metadata.
- Git URLs in full mode require the credentials and permissions defined by ADR
  0023.
