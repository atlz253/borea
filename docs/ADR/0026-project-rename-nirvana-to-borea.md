# ADR 0026: Project Rename — Nirvana to Borea

**Status:** Accepted
**Date:** 2026-07-07
**Author:** Architecture Team

## Context

ADR 0001 established the project under the working title "Nirvana". As the project
approaches a public-facing state, a permanent name is required that better reflects
its identity and philosophy.

The new name "Borea" was chosen, derived from the Greek Βορέας (Boreas) — the god
of the north wind. It evokes the project's core aesthetic: a calm, focused polar
research station for software engineering (see `docs/AESTHETICS.md`).

## Decision

1. The project is renamed from **Nirvana** to **Borea** in all visible branding:
   - documentation (`docs/`, `README.md`, `CONTRIBUTING.md`);
   - UI components (header logo, page titles, copyright notice);
   - OpenAPI document title and description;
   - Git HTTP `WWW-Authenticate` realm;
   - package name and Docker image name.

2. Internal identifiers are also renamed to maintain consistency:
   - Git token prefix: `"nirvana_"` → `"borea_"`;
   - Session cookie name: `"nirvana-session"` → `"borea-session"`;
   - Default SQLite database filename: `nirvana.db` → `borea.db`;
   - Docker volume name: `nirvana-data` → `borea-data`;
   - Test temporary directory prefixes: `nirvana-*` → `borea-*`.

3. ADR 0001 is left untouched as a historical record of the original working title.

4. The repository root directory and GitHub URL remain unchanged.

### Consequences

**Positive:**

- The project has a distinctive, meaningful name aligned with its aesthetic and
  philosophy.
- All technical identifiers are consistent with the new name.
- The rename happens at pre-MVP stage, minimising migration cost.

**Negative:**

- Existing Git personal access tokens using the `nirvana_` prefix are invalidated.
  All users must generate new tokens.
- Active cookie sessions under the old `nirvana-session` name are invalidated.
  Users must re-authenticate.
- Existing databases named `nirvana.db` are no longer read; data must be migrated
  manually or a fresh database created.

## Supersedes

This ADR does not supersede any prior ADR — it documents a project-wide rename
that is orthogonal to all architectural decisions.

## References

- [AESTHETICS.md](../AESTHETICS.md) — project aesthetic and philosophy document.
- ADR 0001 — original framework decision under the working title "Nirvana".
