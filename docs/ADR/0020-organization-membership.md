# ADR 0020: Equal Organization Membership

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Architecture Team

## Context

ADR 0019 associates each organization with one owner. Teams need to share
organizations and every contained repository before role-based authorization is
introduced.

The MVP has no email delivery or invitation-token infrastructure. It can only
add accounts that already exist in the configured `AuthProvider`.

## Decision

1. Organizations have equal members and no owner role.
2. The user creating an organization becomes its first member.
3. Every member can view the member list and add another registered user by
   normalized email.
4. Membership grants full access to the organization and all its repositories
   and pull requests.
5. Membership records are stored under
   `organizations/<organization>/members/<userId>.json`.
6. Organization creation creates its directory exclusively, writes the first
   membership, and publishes `organization.json` last as the commit marker.
   Failed creations remove the incomplete directory.
7. Requests from non-members resolve the organization as not found.
8. NoAuth continues to bypass organization access checks, but membership
   listing and management are unavailable.
9. Existing `ownerId` metadata is not migrated.

## Consequences

- All organization members have the same capabilities.
- Role-based permissions, member removal, leaving an organization, and
  ownership transfer remain future work.
- Pending invitations and invitation links are not supported.
- Data created under ADR 0019 must be recreated manually.
- Git smart-HTTP remains public as documented by ADR 0019.
