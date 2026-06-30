# ADR 0005: Application Layout — Mantine AppShell

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The project needs a consistent page layout inspired by GitHub: header at top, navigation sidebar on left, main content area on right, footer at bottom. The UI design system (ADR 0004) mandates Mantine. Mantine provides `AppShell` — a responsive shell component for exactly this pattern.

The Technical Specification §4.4 defines pages: Dashboard, Repository page, PR page, Repository settings — all share a common layout shell.

Key architectural constraints:
- Full-stack framework: TanStack Start with file-based routing (ADR 0001)
- UI: Mantine v9.x (ADR 0004)
- Project structure: thin routes + module-owned pages (ADR 0003)
- No marketing/landing page — all pages are app pages with the sidebar

## Alternatives Considered

1. **Per-page layout (no global shell)** — inconsistent UX, violates DRY.
2. **Hand-rolled CSS Grid/Flexbox layout** — rejected per ADR 0004 philosophy of "not think about UI layout/component development".
3. **Radix-based custom shell** — not a ready-made solution (ADR 0004).
4. **Fixed footer via AppShell.Footer** — rejected in favour of end-of-content footer (GitHub-like, saves vertical space for code-heavy content).

## Decision

1. **Mantine AppShell** as the global layout wrapper, rendered in `__root.tsx` via a new `AppShellLayout` component.
2. **Layout sections:**
   - **Header** — fixed at top (`AppShell.Header`): mobile burger (hidden on `>=sm`), logo link to `/`, theme toggle on the right.
   - **Navbar** — fixed on the left (`AppShell.Navbar`), collapsible on mobile via burger. Contains app navigation menu rendered as Mantine `NavLink` components.
   - **Main** — scrollable content area (`AppShell.Main`): renders the current route's children followed by the **footer** as a static (end-of-content) element.
   - **Footer** — not fixed; rendered inside `AppShell.Main` at the end of the content flow. Matches GitHub's end-of-content footer.
3. **Responsive behaviour:** Navbar collapses below the `sm` breakpoint into a side drawer toggled by the burger button.
4. **Sidebar content (MVP):** a single "Repositories" `NavLink` pointing to `/repositories`. Additional items (Pull Requests, Dashboard, Settings) can be added as new modules are implemented.
5. **State management for burger:** `useDisclosure` hook lives in `AppShellLayout`; `Header` receives `opened` and `onBurgerClick` props (explicit prop passing, no context).

### File structure (new)

| File | Purpose |
|------|---------|
| `src/components/AppShellLayout.tsx` | Composes `AppShell` with header/navbar config, manages burger state, renders Header + Sidebar + children(including Footer) |
| `src/components/Sidebar.tsx` | `AppShell.Navbar` with a scrollable `AppShell.Section` containing NavLink items |

### Modified files

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Rewritten as `AppShell.Header`; receives `opened`/`onBurgerClick` props; renders Burger + logo + ThemeToggle |
| `src/components/Footer.tsx` | Minor adjustment — no longer a fixed `AppShell.Footer`, but a plain `<footer>` rendered at end of `AppShell.Main` |
| `src/routes/__root.tsx` | Wraps children in `<AppShellLayout>` instead of rendering Header/Footer directly |
| `src/routes/index.tsx` | Replaced marketing placeholder with a redirect to `/repositories` (no landing page) |

### Removed files

| File | Reason |
|------|--------|
| `src/routes/about.tsx` | Scaffold artifact — conflicts with "only app pages" decision |

## Consequences

### Positive
- Consistent GitHub-like layout across all pages.
- Responsive by default (Burger + mobile collapse).
- Mantine-idiomatic — respects ADR 0004's "ready-made" philosophy.
- Sidebar is trivially extensible: add more `NavLink` items as new modules are implemented.
- End-of-content footer saves vertical space for code-heavy pages.

### Negative
- Fixed header/navbar consume viewport space (acceptable for a dev-tool UI).
- All pages get the sidebar by default — no landing-page exception (acceptable by design decision).
- Tests require Router context wrapping for components using TanStack `Link`/`useLocation`.
