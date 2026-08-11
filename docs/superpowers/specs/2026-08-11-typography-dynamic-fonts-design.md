# Typography Section Redesign: Heading / Body / Mono Font Roles

## Context

The Storybook theme editor addon (`packages/shared-ui/.storybook/addons/theme-editor/`) lets an engineer edit design tokens live and sync them back into `packages/shared-ui/src/styles/`. Its current Typography section (`FontSelector.tsx`) is built around a multi-font "stack" model — pick a primary font plus optional fallback fonts, add/remove pills, quick-add from a hardcoded popular-fonts list — for exactly two roles: `--font-sans` and `--font-mono`.

This redesign replaces that with a simpler, three-role model (Heading / Body-Text / Mono), where the engineer types the full CSS `font-family` value directly and (optionally) a stylesheet URL that actually loads the font.

## Problem found during investigation

`packages/shared-ui/src/components/heading/heading.css.ts` already applies a `font-heading` Tailwind utility class to the shared `Heading` component, which wraps all six heading levels (`h1`–`h6`) through one `headingStyles` variant set (`base: "font-heading text-foreground tracking-tight ..."`).

However, `--font-heading` was never defined in `global.css`'s `@theme` block. Verified by compiling a minimal Tailwind v4 build against the real `global.css` theme values plus a test class list matching `heading.css.ts`'s output:

```css
.font-mono { font-family: var(--font-mono); }
.font-sans { font-family: var(--font-sans); }
```

No `.font-heading` rule was generated — Tailwind v4 silently drops any utility whose theme key doesn't exist. So `font-heading` currently contributes nothing to the compiled stylesheet; headings only visually render in Inter because that's what cascades down from `<body>`'s `font-sans` rule (`@layer base { body { @apply ... font-sans; } }`) by ordinary CSS inheritance, not because of the class placed on them.

This redesign completes that gap rather than introducing new scope: `--font-heading` becomes a real, independently-editable token.

## Scope

Three font roles, each mapping to one existing (or newly-added) CSS custom property and one already-existing consumer in the component layer:

| Role | Token | Consumer |
|---|---|---|
| Heading Font | `--font-heading` (**new**) | `Heading` component (`heading.css.ts`), applies uniformly across `h1`–`h6` via the shared `base` style |
| Body / Text Font | `--font-sans` (existing) | `<body>` base style (`global.css`'s `@layer base`) |
| Mono Font | `--font-mono` (existing) | e.g. `chart.tsx`'s tabular numbers, any monospace usage |

Out of scope for this pass (explicitly deferred, not silently dropped):
- Auto-downloading and self-hosting font files (`woff2`) from a pasted URL. Only the "reference an external stylesheet URL" mode is being built now; a Fontsource-only auto-download mode was discussed and deferred to a separate follow-up.
- Per-heading-level font overrides (e.g. `h1` different from `h6`) — the existing `Heading` component architecture applies one font uniformly across all levels via its shared `base` style, and this redesign doesn't change that.
- Any change to the multi-font fallback *stack builder* UI paradigm — it's being replaced outright for these three roles, not extended.

## Design

### 1. Token model & defaults

- `--font-heading` is added to `global.css`'s `@theme` block for the first time, as part of shipping this feature (seeded manually once — see Write-path below for why).
- Its initial value matches whatever `--font-sans` currently resolves to (Inter's stack), **not** a new default like Merriweather. Reasoning: the moment `--font-heading` starts actually being read by the compiled CSS, every heading everywhere would switch to render with whatever value it holds. Since headings today visually render as the body font (via inheritance, per the investigation above), defaulting to the same value means wiring up the fix causes zero visual change by itself — an engineer then deliberately opts into a different heading font through the editor when they want that visual change, rather than it happening as a side effect of this fix landing.
- `--font-sans` and `--font-mono` are unchanged tokens, just relabeled "Body / Text Font" and "Mono Font" in the UI to describe what they actually govern.

### 2. Component shape

The current `FontSelector.tsx` is retired (confirmed nothing outside `TypographyGroup.tsx` imports it) — it's built entirely around the multi-font pill/stack paradigm (`parseFontStack`, add/remove pills, hardcoded popular-fonts quick-add buttons) that this redesign replaces, not extends.

A new, smaller component, `FontRoleInput.tsx`, replaces it — two fields only:
- **Font Name** — free text, holds the *complete* CSS `font-family` value the engineer wants for this token, typed directly (e.g. `"Merriweather", serif`). Not a bare name — no fallback-suffix auto-generation happens on top of it. The old `FontSelector` had a similar raw "CSS value" text input already; this keeps that, without the pill-building layer that used to sit above it.
- **Font Source URL** (optional) — free text, a stylesheet URL that actually loads the named font (Google Fonts CSS2 link, Fontsource CSS link, or any URL serving valid CSS with `@font-face` rules inside it).

`TypographyGroup.tsx` renders `FontRoleInput` three times — Heading, Body/Text, Mono — laid out per the original mockup:

```
── Typography ──────────────────
Heading Font
  name: [...]
  url:  [...]
Body / Text Font
  name: [...]
  url:  [...]
Mono Font
  name: [...]
  url:  [...]
```

### 3. Data flow

State in `ThemeEditor.tsx` gains one new map alongside the existing `tokens` state:

```ts
const [fontSourceUrls, setFontSourceUrls] = useAddonState<Record<string, string>>(
  `${ADDON_ID}/font-source-urls`,
  {}
);
```

Keyed identically to `tokens` (`--font-heading` / `--font-sans` / `--font-mono` → URL string), so the two maps stay symmetric. The Name field of each `FontRoleInput` writes through the existing `handleTokenUpdate(key, value)` path (same mechanism `ColorGroup`/`SliderInput` already use) — no new write path needed for the name. The URL field writes through a new `handleFontSourceUrlUpdate(key, url)` that updates `fontSourceUrls`, clearing the key when the URL is emptied.

`PresetManager.tsx`'s Save & Sync payload gains one field:

```ts
{ light: currentTokens, dark: DARK_MODE_OVERRIDES, fontSourceUrls, lastUpdated: ... }
```

### 4. Write-path (`vite-plugin-theme-sync.ts`)

This is the only sync file remaining in the repo (the `scripts/sync-theme.js` manual fallback was dropped in a prior pass as redundant, since the `/theme-sync` endpoint registered in `main.ts` is the sole reliable path for a dev-only, single-engineer tool).

- **Token values** (`--font-heading`, `--font-sans`, `--font-mono`): add `--font-heading` to the existing `GLOBAL_CSS_TOKENS` list, which already patches `--font-sans`/`--font-mono` in place inside `global.css`'s `@theme` block via a targeted regex replace (not a full-file overwrite).
  - **Known limitation, called out explicitly rather than silently accepted**: the patch mechanism only replaces an *existing* line — it doesn't insert a new one if the token is entirely missing from the file. Since `--font-heading` doesn't exist in `global.css` yet, this feature includes seeding that line once, manually, with the default value from Section 1. From that point forward, saves patch it in place exactly like the other two tokens already do. If that line is ever manually deleted from `global.css` later, future saves would silently stop updating it — the same pre-existing class of limitation `--font-sans`/`--font-mono` already have today, not a new risk introduced by this feature.
- **Source URLs**: a new `updateFontFaceImports(themeData)` function:
  1. Reads `themeData.fontSourceUrls`, drops empty/falsy values.
  2. Dedupes by URL string (so pasting the same multi-family Google Fonts link into two roles only produces one `@import`).
  3. Fully regenerates a delimited, managed block — e.g. `/* @theme-editor:imports:start */` … `/* @theme-editor:imports:end */` — at the very top of `packages/shared-ui/src/styles/fontface.css`, above the hand-written `@font-face` blocks (Inter, JetBrains Mono). `@import` rules must precede all other rules in a CSS file, which is why this can't just be appended at the end.
  4. Because the block is fully regenerated (not appended-to) on every save, a URL that gets cleared from the UI correctly disappears from the file instead of accumulating stale imports.

Example output line format, matching the URL syntax already confirmed working against the real CDN:

```css
@import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&display=swap');
```

## Summary of what changes on disk

- `packages/shared-ui/src/styles/global.css` — one new line seeded (`--font-heading`, defaulted to match `--font-sans`), plus future saves patch it like the other two font tokens.
- `packages/shared-ui/src/styles/fontface.css` — gains a managed `@import` block at the top, regenerated on every Save & Sync; hand-written `@font-face` blocks below it are untouched.
- `packages/shared-ui/.storybook/addons/theme-editor/components/FontSelector.tsx` — deleted.
- `packages/shared-ui/.storybook/addons/theme-editor/components/FontRoleInput.tsx` — new, replaces it.
- `TypographyGroup.tsx`, `ThemeEditor.tsx`, `PresetManager.tsx`, `vite-plugin-theme-sync.ts` — updated for the new data flow described above.
