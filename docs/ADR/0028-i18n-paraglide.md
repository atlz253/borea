# ADR 0028: Internationalization with Paraglide JS

**Status:** Accepted
**Date:** 2026-07-07

## Context

The project is preparing for its first public release (v0.1.0 MVP). Currently all user-facing text is hardcoded in English. To reach Russian-speaking developers (the primary target audience), we need internationalization support with Russian as the first translated locale.

Key requirements:
- Switchable UI language (EN/RU) persisted across sessions
- Minimal bundle impact (many micro-apps with independent SEO)
- Recommended integration path for TanStack Start
- No URL-based locale prefixes (simple cookie strategy)
- Service-layer error messages deferred to a future pass

## Alternatives Considered

### react-i18next
- **Pros:** Most popular i18n library, vast ecosystem
- **Cons:** Runtime overhead (~12 KB gzipped), not tree-shakable, requires custom TanStack Start SSR integration, not officially recommended by TanStack Start

### FormatJS / react-intl
- **Pros:** Industry standard, ICU message syntax
- **Cons:** Runtime message resolution, larger bundle, complex server-side integration

### LinguiJS
- **Pros:** Compiler-based like Paraglide, transforms to plain function calls
- **Cons:** More complex setup, smaller community, not explicitly recommended by TanStack Start

### Paraglide JS (Selected)
- **Pros:** Compiler-based (not runtime), tree-shakable (unused translations eliminated), officially recommended by TanStack Start, simple Vite plugin + middleware integration, small bundle overhead, message catalogs in plain JSON
- **Cons:** Younger ecosystem (but stable), message-matcher plugin required for ICU-style pluralization

## Decision

Use **Paraglide JS** (`@inlang/paraglide-js`) with the following configuration:

| Property | Value |
|---|---|
| Base locale | `en` (English) |
| Additional locale | `ru` (Russian) |
| Detection strategy | `cookie` + `baseLocale` (no URL prefixes) |
| Cookie name | `PARAGLIDE_LOCALE` |
| Output directory | `./src/paraglide/` |
| Message files | `messages/en.json` and `messages/ru.json` |

### Scope of first pass
- All UI-layer strings in `.tsx` files (pages, components, routes) — **~130 strings**
- Zod schema validation messages — **~40 strings** (deduplicated)
- PR status enum labels (`open`/`merged`/`closed`)
- Role label maps (`owner`/`administrator`/`moderator`/`member`, `read`/`write`/`moderator`)
- Hardcoded `lang="en"` in root HTML
- Hardcoded `Intl.DateTimeFormat("en-US", ...)` calls (5 sites)

**Deferred (TODO for v0.2):**
- Service-layer error messages (`throw new Error(...)` in service files) — ~85 strings
- API HTTP response bodies (`src/routes/api/git/$.tsx`) — ~6 strings
- DB persistence of locale preference (cookie-only for MVP)

### Detection workflow
1. On first request (no cookie): `baseLocale` ("en") is used
2. User switches language via LanguageToggle in Header → `setLocale("ru")` sets a cookie with 1-year expiry
3. On subsequent requests: `cookie` strategy reads `PARAGLIDE_LOCALE` cookie
4. Server-side rendering uses the cookie value for `paraglideMiddleware`

### Message key naming convention
```
<module>.<file>.<element>[.<detail>]
```
Examples:
- `auth.authPage.signIn.button`
- `organizations.organizationPage.members.heading`
- `shared.header.logOut`
- `routes.repository.tabs.code`
- `schemas.repositories.nameRequired`
- `pr.status.open`

## Consequences

### Positive
- Zero runtime overhead for message resolution (compiled to function calls at build time)
- Unused translations are tree-shaken away (dead code elimination)
- Type-safe messages (TypeScript types are generated for all message keys)
- Simple SSR integration via Vite plugin + middleware wrapper
- Message catalogs are plain JSON — easy to edit, review, and version-control

### Negative
- JSON message files are a new external concern outside TypeScript (no TS validation of message content)
- Adding a new locale requires updating all message files
- Service-layer error messages remain in English until v0.2 (creates a bilingual UX gap for error states)
- Generated code in `src/paraglide/` must be excluded from Biome checks and committed (or regenerated on each build)

### Neutral
- The `paraglideMiddleware` wrapper adds a thin layer to server request handling
- Message catalog must be extracted and maintained manually (no auto-extraction like some tools offer)
- Developers must remember to add messages to both EN and RU catalogs when adding new UI strings
