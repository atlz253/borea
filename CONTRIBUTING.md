# Contributing to Nirvana

Thank you for your interest in contributing! Nirvana is an open-source software development workspace.

## Development Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes following the code conventions below.
3. Ensure all checks pass (see below).
4. Submit a pull request.

## Required Checks

Before submitting a PR, run these commands and ensure they all pass:

```bash
npm run check          # Biome lint + format (must pass clean)
npx tsc --noEmit       # Typecheck (strict; no errors)
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright E2E tests
npm run generate-routes  # Regenerate route tree if routes were added/removed
```

## Code Conventions

- **Formatting:** tabs for indentation, double quotes for strings (enforced by Biome).
- **No comments** in source code unless explicitly requested by the reviewer.
- **Imports:** use path aliases `#/*` or `@/*` (map to `./src/*`). Run "organize imports" on save.
- **Module boundaries:** cross-module imports must go through the barrel (`index.ts`). Deep imports into internal module subpaths are forbidden (enforced by Biome `style/noRestrictedImports`). See `docs/ADR/0003-project-structure.md`.
- **Routes are thin:** route files in `src/routes/` contain only `createFileRoute`, a loader, and rendering of a page component from `src/modules/<domain>/pages/`. Domain logic belongs in modules.
- **Mantine imports:** import components from `@mantine/core`, hooks from `@mantine/hooks`, code highlighting from `@mantine/code-highlight`.
- **Tests:** follow TDD principles (see `docs/MVP.md` §10). Co-locate unit tests next to source files (`*.test.ts`).

## Architectural Decisions (ADRs)

For any architectural or structural change, create a new ADR in `docs/ADR/` before implementing. Each ADR file follows the naming convention `00NN-title-in-kebab-case.md` and should cover:

- **Context** — why the decision is needed
- **Alternatives Considered** — what else was evaluated
- **Decision** — what was chosen
- **Consequences** — positive and negative outcomes

See existing ADRs in `docs/ADR/` for examples.

## Documentation

New features and user-facing changes must be documented:
- Architectural decisions go in `docs/ADR/`.
- Feature documentation goes in `docs/`.
- Update `README.md` if the stack, structure, or commands change.
- Update `API.md` if endpoints are added or changed.
- Update `docs/repository-page.md` if repository UI pages are extended.
- Update `docs/ADR/README.md` when adding a new ADR.

## Security

- No secrets, keys, or credentials in commits.
- NoAuth mode (MVP) must not be accidentally enabled in production. See `docs/security/noauth-mode.md`.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](LICENSE)).
