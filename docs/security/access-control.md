# Access Control

Borea enforces organization and repository permissions in full
authentication mode. All role values in JSON and REST requests are lowercase.

## Organization Roles

| Role | Capabilities |
|---|---|
| `owner` | All organization and repository actions, ownership transfer, organization deletion |
| `administrator` | Organization settings, `member`/`moderator` role management, repository creation and deletion, full repository access |
| `moderator` | Invite and remove ordinary members, create and delete repositories, full repository access |
| `member` | Read organization information; repositories require an explicit grant |

An organization has one owner. Assigning `owner` to another existing member
transfers ownership and changes the previous owner to `member`.

Member removal follows the role hierarchy. A user who owns a repository cannot
be removed until that repository is deleted.

## Repository Roles

| Role | Capabilities |
|---|---|
| `read` | Repository files, commits, diffs, and pull requests |
| `write` | `read` plus branch creation, pull request creation and merge, viewed-file changes |
| `moderator` | `write` plus management of `read` and `write` grants |

The repository creator is its owner and can manage access or delete the
repository. Organization owners, administrators, and moderators have the same
effective repository capabilities without an explicit grant.

Repository grants can be assigned only to ordinary organization members. A
repository moderator cannot assign another `moderator` or remove an existing
moderator grant.

## Resource Visibility

Repository listings include only repositories for which the current user has
effective read access. Direct access to a hidden organization or repository
returns `404`. An action denied on a visible resource returns `403`.

## NoAuth and Git HTTP

NoAuth bypasses access checks, hides membership-management controls, and keeps
Git smart-HTTP credential-free. It is intended only for local development.

Full mode requires a Git personal access token. Clone and fetch require
repository `read`; push requires `write`. A user without read access receives
`404`, while a reader attempting to push receives `403`. Role changes and token
revocation apply to the next Git request.
