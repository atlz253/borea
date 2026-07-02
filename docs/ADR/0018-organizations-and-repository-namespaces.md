# ADR 0018: Organizations and Repository Namespaces

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Architecture Team

## Context

Repositories and pull requests were previously identified only by repository
name. This prevents independent teams from using the same repository name and
does not provide a boundary for future membership and permissions.

Development and most feature tests do not need multiple organizations. They
need the same namespaced domain model without repeatedly creating or selecting
an organization.

## Decision

1. Organizations are implemented as the `organizations` domain module.
2. Repository identity is the structured pair `organizationName` and
   `repositoryName`.
3. UI, REST, Git smart-HTTP, Git storage, and pull-request storage always use
   the organization namespace.
4. `ORGANIZATION_MODE=multi` is the default and permits listing and creating
   organizations.
5. `ORGANIZATION_MODE=single` exposes only the fixed `default` organization,
   creates it idempotently on first access, and rejects organization creation.
6. Organizations hidden by single mode remain on disk and are available again
   after switching to multi mode.
7. Existing unnamespaced data and URLs are not migrated or aliased.
8. Organization metadata uses a module-owned `OrganizationStore` abstraction
   with a filesystem implementation for the MVP.

## Storage Layout

```text
data/
  organizations/<organization>/organization.json
  repositories/<organization>/<repository>/
  pull-requests/<organization>/<repository>/
```

## Consequences

- Identically named repositories are isolated between organizations.
- Single mode exercises the same namespaced code paths as multi mode.
- Membership and authorization can be added to the organization module later.
- Existing local data requires manual recreation in a namespaced directory.
- Old `/repositories`, `/api/v1/repositories`, and unnamespaced Git HTTP URLs
  return `404`.
