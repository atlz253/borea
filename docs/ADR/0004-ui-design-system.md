# ADR 0004: UI Design System — Mantine

**Status:** Accepted
**Date:** 2026-06-30
**Author:** Architecture Team

## Context

The Technical Specification (§6.4) lists "UI Component Library" as "to be chosen at implementation stage", and §15 leaves it as open question #2. AGENTS.md records Tailwind CSS v4 as part of the stack, but this was a scaffolding-time default, not an architectural decision.

The project requires a ready-made design system for a developer-tool UI (Git hosting, pull requests, code review, file browsing, diff viewing). Key requirements:

- **Ready-made out of the box** — not a copy-paste collection where components need assembly. Layout primitives (spacing, containers, grids) should be pre-solved.
- **Neutral dev-tool aesthetic** — GitHub/GitLab-like professional look, not a themed/marketing aesthetic.
- **Code/diff support** — syntax highlighting for file browsing, diff rendering for PR review.
- **React 19 + TanStack Start (Nitro SSR)** — must be compatible with the existing full-stack framework (ADR 0001).
- **TanStack Table** — spec §6.1 requires TanStack Table for commit lists, file trees, PR lists.
- **Dark mode** — built-in support, not hand-rolled.
- **Accessibility** — WAI-ARIA compliance (supports §5.2/§9 quality requirements).
- **MIT license** — no commercial restrictions for self-hosted or future SaaS.
- **Icons** — `lucide-react` is already installed and should remain.

The existing codebase has Tailwind CSS v4 + a custom lagoon/island theme (template placeholder), hand-crafted demo classes (`.demo-*`, `.island-shell`, `.feature-card`), and a custom theme toggle. All of these are scaffolding artifacts, not domain UI.

## Alternatives Considered

### shadcn/ui (Radix base)

- **Status:** Rejected by stakeholder — it is a copy-paste component collection, not a ready-made design system. Requires manual assembly, layout decisions, and styling effort.
- **Status:** Also rejected due to its "build your own" philosophy. Not aligned with the goal of not being distracted by UI-kit development.

### shadcn/ui (Base UI base)

- Rejected for the same reasons as Radix-based shadcn, with the additional risk of the Base UI ecosystem being less mature.

### Chakra UI v3

- Complete component library, accessible, neutral aesthetic. However:
  - No built-in code highlighting or diff components (critical for Git hosting).
  - Smaller ecosystem than Mantine; fewer production references.
  - Less mature SSR integration with non-Next.js frameworks.

### MUI (Material UI) v6

- Most mature React component library overall, but:
  - Material Design aesthetic is not "neutral dev-tool like GitHub/GitLab".
  - Heavy bundle, complex theming.
  - Conflicts with the TanStack-native philosophy (ADR 0001).

### Ant Design v5

- Complete enterprise library, but:
  - Chinese-enterprise aesthetic, not neutral.
  - Heavy, opinionated, harder to customize.
  - Community and documentation are Chinese-oriented.

### Radix UI primitives (headless) / Custom Tailwind

- Unstyled primitives or fully hand-crafted approach.
- Rejected because the goal is to **not** think about UI layout/component development.

## Decision

**Adopt Mantine (v9.x) as the project's UI design system.**

Additionally:

- **Remove Tailwind CSS v4 entirely** — Mantine provides all layout primitives (`Container`, `Stack`, `Group`, `Grid`, `SimpleGrid`, `Flex`) and component-level styling. Tailwind is no longer needed.
- **Raw TanStack Table + Mantine `Table`** — TanStack Table (already in the spec) handles table logic (sorting, pagination, selection); Mantine's `Table` component provides the rendering.
- **`lucide-react` retained** — already installed and Mantine works with any icon library.
- **Neutral dev-tool theme** — minimal custom theme wrapping Mantine's defaults (`primaryColor: blue` for links/buttons, system font stack with Manrope override).
- **`@mantine/code-highlight`** — for code syntax highlighting in file browsing.
- **`@mantine/mcp-server`** — MCP tooling for development (see Tooling section below).

### Installation plan

```bash
npm install @mantine/core @mantine/hooks @mantine/code-highlight
npm uninstall tailwindcss @tailwindcss/vite @tailwindcss/typography
```

### Tooling: Mantine MCP

The official `@mantine/mcp-server` (v9.4.1, MIT, by Mantine maintainer rtivital) is added as a local MCP server in opencode config. It provides four tools:

- `list_items` — browse available Mantine component documentation
- `get_item_doc` — get full documentation for a specific component
- `get_item_props` — get props/API reference for a component
- `search_docs` — full-text search across Mantine documentation

This is complementary to Context7 (which provides general library documentation). Mantine MCP takes priority for Mantine-specific queries (props, theming, component API) because it pulls from the authoritative `mantine.dev` source and stays in sync with Mantine releases.

## Consequences

### Positive

- **Ready-made design system** — Mantine provides 120+ components and 70+ hooks out of the box. Layout primitives (`Container`, `Stack`, `Group`, `Grid`, `SimpleGrid`, `Flex`) eliminate ad-hoc spacing decisions.
- **Code/diff support** — `@mantine/code-highlight` provides Prism-based syntax highlighting for file browsing and diff rendering.
- **SSR compatible** — `ColorSchemeScript` + `MantineProvider` + `mantineHtmlProps` are well-established SSR patterns (documented for React Router, Remix, RedwoodJS).
- **React 19** — Mantine v9.1+ supports React 19 via `deduplicateInlineStyles` prop.
- **Dark mode** — `useMantineColorScheme` with `defaultColorScheme="auto"` replaces the hand-rolled theme toggle.
- **Accessibility** — Radix-based components with WAI-ARIA, keyboard navigation, screen reader support.
- **Single styling paradigm** — Mantine's CSS layer-based system replaces the previous Tailwind + custom CSS dual paradigm.
- **Icon library compatibility** — `lucide-react` works with Mantine components (ActionIcon, Button, etc.) without changes.
- **TanStack Table alignment** — Mantine's `Table` component works naturally with TanStack Table's headless logic.
- **MCP tooling** — `@mantine/mcp-server` provides accurate, authoritative Mantine documentation at development time.

### Negative

- **Scaffold rewrite** — Existing components (Header, Footer, ThemeToggle, index, about, __root) and `styles.css` must be rewritten from Tailwind+custom-CSS to Mantine.
- **Bundle size** — Mantine is larger than a hand-picked component set; tree-shaking mitigates but does not eliminate this cost. Acceptable for a single-container MVP.
- **Team learning curve** — Developers need to learn Mantine's style-props, CSS variables, and component API instead of Tailwind utilities.
- **`@tailwindcss/typography` lost** — No direct equivalent for markdown/prose rendering. Deferred: `TypographyStylesProvider` from Mantine + minimal CSS will be added when README/wiki rendering is needed.
- **Custom theme limited** — Mantine's built-in color palette (10 shades per color, strict dark/light tokens) constrains custom theming more than hand-rolled CSS. Matches the "neutral dev-tool" requirement well.

### Risks and Mitigations

1. **Mantine SSR streaming with Nitro**
   _Mitigation:_ Working de-risking spike verified in `__root.tsx` before full migration. If `@mantine/core/styles.css` side-effect import does not load correctly during SSR, fall back to CSS file injection via `links`.

2. **React 19 peer dependency conflicts**
   _Mitigation:_ Mantine v9.1+ is confirmed compatible. Use `--legacy-peer-deps` if npm reports warnings.

3. **Mantine + TanStack Start route transition**
   _Mitigation:_ Mantine's `useMantineColorScheme` persists to `localStorage`; the `ColorSchemeScript` in `<head>` prevents flash of unstyled content. Tested during spike.

4. **Module boundary (ADR 0003)**
   _Mitigation:_ Mantine is an external dependency — no conflict with `noRestrictedImports` rules. Components live in `src/components/` (shared) and `src/modules/<domain>/components/` (domain-specific), both permitted by ADR 0003.

5. **`npx @mantine/mcp-server` cold start**
   _Mitigation:_ First launch downloads the package; `experimental.mcp_timeout` may need adjustment. Subsequent launches use npm cache.

## Open Questions

- **Markdown/prose rendering** — deferred until README/wiki rendering is required for the Git hosting UI. Likely solution: `@mantine/typography` or Mantine `TypographyStylesProvider` with a minimal prose CSS.
- **Mantine version pinning** — exact version or semver range? Decided: exact version in `package.json` to avoid RC-era surprises (following ADR 0001 precaution).

## References

- [Mantine Documentation](https://mantine.dev)
- [@mantine/mcp-server on npm](https://npmjs.com/package/@mantine/mcp-server)
- [shadcn/ui on npm](https://npmjs.com/package/@mantine/mcp-server)
- Previous ADRs: 0001 (framework), 0003 (project structure)
- Technical Specification §6.4, §15
