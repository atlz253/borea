# ADR 0010: Repository Branch URLs

## Context

The repository page currently always shows the HEAD (default) branch. There is no way to switch between branches in the web UI. The repository URL has no branch component:

- `/repositories/$name/` — root tree
- `/repositories/$name/tree/$` — subpath tree
- `/repositories/$name/commits` — commit history

All views operate on HEAD. The GitProvider and Zod schemas already support an optional `ref` parameter for listing files, commits, and counting commits, but the route loaders never pass one.

We need to introduce branch switching in the UI and express the selected branch in the URL.

## Alternatives

### 1. Search-parameter `?ref=<branch>`

Add `?ref=` search param via TanStack Router `validateSearch`. Minimal route changes; all existing paths remain static. Slashes in branch names (e.g. `feature/login`) work naturally because they are encoded in a query parameter.

- Pro: least invasive, no URL conflicts with branch names like "commits".
- Con: the canonical URL does not visually represent the branch as a navigable path segment; diverges from the URL style of GitHub/GitLab (`/tree/<branch>/path`).

### 2. Path segment before `/tree/`

Insert branch as a path segment between the repo name and `/tree/`: `/repositories/$name/$branch/tree/$`. This creates a conflict between literal route names (`commits`, `tree`) and potential branch names — a branch named "commits" would shadow the commit history route.

### 3. Path segment under `/tree/$branch/` (chosen)

Put the branch segment inside the tree path: `/repositories/$name/tree/$branch/...`. Since `tree` is a fixed literal segment, there is no naming conflict. The existing `/repositories/$name/commits` route is replaced by `/repositories/$name/tree/$branch/commits`.

- Con: branch names containing `/` must be percent-encoded (`%2F`) in the URL. TanStack Router treats path segments as separated by `/`; a `%2F` in a single param segment is preserved by the router but may be decoded by the browser. This is a known limitation.
- Con: requires reworking all tree routes and updating all internal links.

## Decision

Use path segments under `/tree/$branch/`:

| Pattern | Route file |
|---|---|
| `/repositories/$name/` | Redirects to `/tree/<defaultBranch>` (empty repos stay) |
| `/repositories/$name/tree/$branch` | `repositories.$name.tree.$branch.index.tsx` |
| `/repositories/$name/tree/$branch/$` | `repositories.$name.tree.$branch.$.tsx` |
| `/repositories/$name/tree/$branch/commits` | `repositories.$name.tree.$branch.commits.tsx` |

Existing routes `/repositories/$name/commits` and `/repositories/$name/tree/$` are removed with no redirect shims.

Branch names with `/` (e.g. `feature/logout`) are percent-encoded to `feature%2Flogout` in the URL. The route param `$branch` receives the raw name with `/` by the router, which handles the decoded value.

## Consequences

- All repository links must now include a branch segment. FileList, breadcrumbs, CommitCountLink, and navigation from the repo list must be updated.
- The repository list page links to `/repositories/$name`; the loader at that path fetches the default branch and redirects to `/tree/<defaultBranch>`.
- Branches with slashes in their names require `%2F` encoding in links (via `encodeURIComponent`). Navigation works because TanStack Router decodes `%2F` back into `/` within the param.
- Empty repositories (no branches) are handled without redirect at `/repositories/$name/` — the route loader renders the empty state directly.
- This is a breaking change for any direct bookmarks to the old `/repositories/$name/commits` or `/repositories/$name/tree/...` URLs — they will 404.
