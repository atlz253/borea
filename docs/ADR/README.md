# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Borea. Each ADR documents a significant architectural choice, including context, alternatives, decision, and consequences.

| # | Title | Description |
|---|-------|-------------|
| 0001 | [Full-Stack TypeScript Framework](0001-fullstack-framework.md) | Choosing TanStack Start (RC) on Nitro over Next.js and Remix |
| 0002 | [E2E Testing Tool](0002-e2e-testing-tool.md) | Choosing Playwright over Cypress and Vitest Browser Mode |
| 0003 | [Project Directory Structure](0003-project-structure.md) | Modular monolith layout, thin routes, platform/ infra, Biome boundary enforcement |
| 0004 | [UI Design System](0004-ui-design-system.md) | Choosing Mantine v9 over shadcn/ui, Chakra, and MUI |
| 0005 | [Application Layout](0005-application-layout.md) | Mantine AppShell with header, sidebar, and end-of-content footer |
| 0006 | [GitProvider Implementation](0006-git-provider-implementation.md) | System Git CLI via execa, filesystem metadata, no database |
| 0007 | [Git Smart-HTTP Pull](0007-git-smart-http-pull.md) | Manual `git-upload-pack --stateless-rpc` for clone/fetch |
| 0008 | [Git Smart-HTTP Push](0008-git-smart-http-push.md) | Manual `git-receive-pack --stateless-rpc` for push |
| 0009 | [Commit History](0009-commit-history.md) | GitProvider extension for listing branches, commits, and counting commits |
| 0010 | [Repository Branch URLs](0010-repository-branch-urls.md) | Path-segment branch under /tree/$branch, redirect from repo root |
| 0011 | [Create Branch UI](0011-create-branch-ui.md) | Create branch from BranchSwitcher menu via POST server function |
| 0012 | [Pull Requests](0012-pull-requests.md) | PR metadata as JSON files, merge via `git merge-tree`/`commit-tree`, URL-driven PR tab |
| 0013 | [Commit Diff](0013-commit-diff.md) | GitProvider extension for viewing structured commit diffs (side-by-side, hunk-based) |
| 0014 | [Pull Request Diff](0014-pull-request-diff.md) | GitProvider extension for three-dot range diff between arbitrary refs (base…head) for PR file viewing |
| 0015 | [Repository File Viewing](0015-repository-file-viewing.md) | Branch-aware blob pages with bounded two-stage UTF-8 file loading |
| 0016 | [Pull Request Viewed Files](0016-pull-request-viewed-files.md) | Persistent path-based Viewed state for pull request files in NoAuth mode |
| 0017 | [REST API v1](0017-rest-api-v1.md) | Versioned repository and pull request REST API with typed errors and OpenAPI 3.1 |
| 0018 | [Organizations and Repository Namespaces](0018-organizations-and-repository-namespaces.md) | Organization domain module, namespaced repositories, and single-organization mode |
| 0019 | [File Authentication and Organization Ownership](0019-file-authentication-and-organization-ownership.md) | File-backed users, cookie sessions, NoAuth compatibility, and owner-scoped organizations |
| 0020 | [Equal Organization Membership](0020-organization-membership.md) | File-backed equal membership with invitations for existing users |
| 0021 | [Organization and Repository Access Control](0021-access-control.md) | Lowercase organization roles, repository grants, ownership, and permission enforcement |
| 0022 | [Pull Request File Comments](0022-pull-request-file-comments.md) | Append-only file discussion threads stored separately from public pull request metadata |
| 0023 | [Git Smart-HTTP Authentication](0023-git-smart-http-authentication.md) | Personal access tokens and repository permission enforcement for Git HTTP |
| 0024 | [Branch Rename](0024-branch-rename.md) | In-UI branch renaming via GitProvider.renameBranch and server function |
| 0025 | [SQLite + Prisma 7 ORM](0025-sqlite-prisma-orm.md) | Migrating metadata storage from JSON files to SQLite via Prisma 7 with JS driver adapter |
| 0026 | [Project Rename: Nirvana to Borea](0026-project-rename-nirvana-to-borea.md) | Renaming the project from Nirvana to Borea with aesthetic direction |

## Adding a New ADR

1. Choose the next number (e.g., `0010`).
2. Create a file named `00NN-title-in-kebab-case.md`.
3. Follow the existing format: Context / Alternatives / Decision / Consequences.
4. Update this index (`README.md`) with the new entry.
5. Update `docs/README.md` and the project `README.md` if needed.
