# Final Check Skill

This skill verifies that all Definition of Done requirements are met after completing a task in the Borea project.

## What it checks:

1. **Linting and Formatting** - Runs `npm run check` to verify Biome linting and formatting
2. **TypeScript Checking** - Runs `npx tsc --noEmit` to verify type checking passes
3. **Unit Tests** - Runs `npm run test` to ensure all unit tests pass
4. **E2E Tests** - Runs `npm run test:e2e` to ensure all E2E tests pass
5. **Route Tree** - Verifies that the route tree file exists and is readable
6. **Documentation** - Checks that documentation directory exists
7. **Secrets Check** - Verifies .gitignore exists to prevent committing secrets

## Usage:

```bash
cd C:/Projects/nirvana/.agents/skills/final-check
npm run check
```

Or directly:
```bash
node checker.js
```

## Requirements:

- Node.js (v14+ recommended)
- npm installed
- Project must be in a valid state with all dependencies installed