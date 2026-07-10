# 0034. User-Scoped Repositories

## Context

Borea originally treated repositories as organization-scoped resources. That model works for teams, but it makes a personal Git hosting use case depend on creating or using a real organization even when the user only needs a centralized repository namespace.

User registration also carried both `name` and `email`, while the product now needs a stable URL-safe user namespace. Keeping a separate display name would make owner identity ambiguous in repository URLs, sidebar lists, Git clone URLs, and API responses.

## Alternatives

- Keep personal repositories under `/organizations/:username`.
  This reuses organization routing, but it makes users look like organizations and pollutes the organization list with pseudo-organizations.
- Create implicit real organizations for every user.
  This preserves repository ownership mechanics, but it adds team concepts to accounts that do not need them.
- Add a first-class user repository namespace.
  This requires broader locator changes, but it keeps personal and organization ownership explicit.

## Decision

Personal repositories are first-class user-scoped resources.

- Browser routes use `/users/:username` and `/users/:username/repositories/:repository`.
- REST routes start with `GET` and `POST /api/v1/users/:username/repositories`, plus read and delete routes at `/api/v1/users/:username/repositories/:repository`.
- Git smart-HTTP accepts `/api/git/users/:username/:repository.git/...`.
- Clone URLs for personal repositories use `/api/git/users/:username/:repository.git`.
- Repository locators can target either `{ organizationName, repositoryName }` or `{ userName, repositoryName }`.
- `User.name` is removed. `User.username` is the display identity and URL namespace.
- Usernames are immutable in this feature version and must contain only ASCII letters, digits, `.`, `_`, and `-`; they cannot be `.`, `..`, or start with `.`.

Organization repositories remain organization-scoped and continue to use `/organizations/:organization`.

## Consequences

The sidebar can show personal and accessible organization repositories together while keeping the organization list limited to real organizations. Personal repository permissions are owner-only for this version; sharing personal repositories remains out of scope.

Existing users are migrated by deriving usernames from the email local-part, normalizing invalid characters, and adding deterministic suffixes for collisions. API clients must use `username` instead of `name` in registration and user responses.
