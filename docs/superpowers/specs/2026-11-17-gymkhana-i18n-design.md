# Gymkhana i18n Design

## Intent

Add complete Brazilian Portuguese and English localization across Gymkhana, including public, dashboard, settings, booking, and member experiences. Portuguese (Brazil) is the default; English is an explicitly selectable alternative. The language choice persists between visits, while existing route URLs and application behavior remain intact.

## Goals

- Localize visible navigation, page content, forms, validation copy, errors, loading/empty states, and shared controls.
- Use natural Brazilian gym terminology and idiomatic English.
- Keep the selected locale consistent in server and client rendered UI.
- Format dates, numbers, and currency according to the selected locale while preserving business values and API contracts.
- Validate with typecheck, lint, and relevant tests under the supported Node/npm versions.

## Non-goals

- Translate user-authored content, database records, API payloads, logs, or external integrations.
- Change authentication, permissions, business rules, route structure, or database schema.
- Translate generated PDFs/WhatsApp content unless those are part of an existing user-facing screen.

## Constraints and anti-goals

- Next.js 16 App Router, React 19, Server Components, and existing route URLs must be preserved.
- Use `next-intl` with a locale cookie and no locale URL prefixes.
- `pt-BR` is the fallback/default locale; `en` is the alternate locale.
- Avoid hydration mismatches and avoid changing locale implicitly based on browser language.
- Preserve all existing local changes in the worktree, especially the staged APYM/G2 changes.
- Do not claim complete translation if any user-facing route or shared interface remains untranslated.

## Approaches

1. **`next-intl` with locale prefixes (`/pt-BR`, `/en`)**: gives canonical locale URLs and standard routing, but requires migrating existing routes and links. Rejected because the requested behavior is to preserve current behavior and the chosen preference is existing URLs.
2. **`next-intl` with locale cookie and existing URLs (selected)**: keeps current routes and supports locale-aware server and client rendering; requires server request configuration and a persistent selector.
3. **A custom client-only dictionary/context**: less setup, but server-rendered pages, validation copy, and first paint can disagree with the persisted selection. Rejected because many routes are server components and the user requested a whole-app experience.

## Proposed design

- Add `next-intl` request configuration resolving a validated `NEXT_LOCALE` cookie and falling back to `pt-BR`.
- Supply locale and messages through the root provider so client components use typed translation keys; server components use the server translation API.
- Keep translation catalogs organized by product area and shared vocabulary, with Portuguese as the source catalog and English covering the same key set.
- Add a reusable language selector in the global application shell, persist selection in the locale cookie, and refresh the current route so server-rendered content updates without navigation changes.
- Localize `html lang`, metadata where applicable, and format helpers using `pt-BR`/`en` locale conventions. Keep API and persisted domain values unchanged.
- Translate user-visible Zod/form validation and error messages at their presentation boundaries; do not translate machine-readable API error codes.
- Audit all 49 page routes and shared components, including login/signup, booking/widget, dashboard, member area, settings, legal pages, and error/loading states. Do not mechanically translate user data or identifiers.
- Add tests for default locale, valid/invalid cookie resolution, selector persistence, message catalog parity, and representative rendering in both locales.

## Open implementation choices

- Exact cookie lifetime and `SameSite` settings should follow existing app cookie conventions, with a long-lived preference cookie and `SameSite=Lax`.
- Translation catalogs may be split into JSON files by area to keep keys reviewable; exact file layout is an implementation choice.
- Existing baseline typecheck failures, if any, must be distinguished from regressions using the current worktree and supported Node version.

## Approval boundary

This design authorizes no implementation by itself. After approval, produce a file-level implementation plan, then implement and verify the approved scope.
