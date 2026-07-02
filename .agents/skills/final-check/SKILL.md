---
name: final-check
description: Verifies all Definition of Done requirements are met after completing a task
---

# Final Check Skill

This skill verifies that all Definition of Done requirements are met after completing a task.

## Requirements Checked

Based on the Definition of Done in AGENTS.md, this skill checks:

1. ✅ Integration/E2E tests are written for the feature or change
2. ✅ `npm run check` passes with no errors (linting + formatting)
3. ✅ `npx tsc --noEmit` passes with no errors (type checking)
4. ✅ `npm run test` passes (unit tests)
5. ✅ Integration/E2E tests covering the affected logic pass
6. ✅ If routes were added/removed, `src/routeTree.gen.ts` is regenerated
7. ✅ Documentation is updated
8. ✅ No secrets, keys, or credentials committed

## Implementation

The skill executes the following checks in sequence:

1. Run `npm run check` to verify linting and formatting
2. Run `npx tsc --noEmit` to verify type checking
3. Run `npm run test` to verify unit tests pass
4. Run `npx playwright test --only-changed` to verify E2E tests pass (only changed tests)
5. Check if route tree file exists and is readable
6. Verify documentation directory exists
7. Verify .gitignore exists to prevent committing secrets

## Usage

```bash
cd .agents/skills/final-check
node checker.cjs
```

The skill will output a detailed summary of all checks and indicate whether all requirements have been met.