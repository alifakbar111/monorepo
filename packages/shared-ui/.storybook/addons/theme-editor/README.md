# Theme Editor (Storybook addon)

Internal Storybook addon for editing `shared-ui`'s design tokens live and syncing
them back into the real source CSS files. It exists so one engineer can push a
Figma design-system update (colors, radius, spacing, fonts) across all `shared-ui`
components at once, instead of hand-editing each component's styles file.

**Dev-only.** This addon lives entirely under `.storybook/` (Storybook
configuration, not package source) and is wired up only through
`.storybook/main.ts` and `.storybook/manager.ts`. It is never imported by
anything under `src/`, never built by `vite build`, and never ships in the
published package.

## Opening it

```sh
pnpm --filter shared-ui storybook
```

Starts Storybook at `http://localhost:6006`. The **Theme Editor** panel is
registered on the right-hand panel dock (`manager.ts`); select it from the
panel tabs.

## What it edits, and where values come from

On mount, the panel does `GET /theme-sync` (an endpoint added to Storybook's
Vite dev server by `vite-plugin-theme-sync.ts`, registered in `main.ts`). That
handler parses the *actual current* token values out of `src/styles/colors.css`
(`:root` block) and `src/styles/global.css` (`@theme` block) and returns them.
The panel uses this as its source of truth, since it's what Storybook's preview
is really rendering from.

Only if the dev server is unreachable does it fall back to the hardcoded
`DEFAULT_TOKENS` snapshot in `constants.ts` — and shows a visible red warning
banner in the panel when it does, since that snapshot can silently drift out of
sync with disk over time.

Token groups shown in the panel (`constants.ts` → `TOKEN_GROUPS`):

- **Base / Brand / Surface / Neutral / Status Colors** — color pickers.
- **Border & Radius** — border/input/ring colors plus `--radius`.
- **Spacing & Layout** — `--spacing`, `--sidebar-width`,
  `--sidebar-width-mobile`, `--sidebar-width-icon`.
- **Typography** — `--font-heading`, `--font-sans`, `--font-mono`.

## Colors

`ColorPicker` accepts any CSS color format and auto-converts it to `oklch()`
for storage (`autoConvert` prop, on by default), using
`utils/color-converter.ts`. The swatch preview is computed via a hidden DOM
element so you see an accurate rendered color even before conversion.

## Sizes (Border Radius, Spacing, Sidebar Width)

`SizeInput` is a plain number field plus a `rem` / `px` unit dropdown — there
is no slider. Switching the dropdown **converts** the number to preserve the
same rendered size (16px = 1rem) rather than just relabeling the existing
digits, so you can punch in a Figma spec in px without hand-calculating the
rem equivalent.

This covers the sidebar-width tokens (`--sidebar-width`, `-mobile`, `-icon`),
which previously weren't exposed in the editor UI at all.

## Typography

Three `FontRoleInput` fields — **Heading Font**, **Body / Text Font**, **Mono
Font** — mapping to `--font-heading`, `--font-sans`, `--font-mono`
respectively. Each has exactly two inputs:

- **Name** — the complete CSS `font-family` value, typed directly (e.g.
  `"Merriweather", serif`). This is stored verbatim as the token value; the
  editor does **not** auto-append a fallback stack on top of what you type.
- **Source URL** (optional) — a stylesheet URL that actually loads the named
  font: a Google Fonts CSS2 link, a Fontsource CSS link, or any URL serving
  valid CSS with `@font-face` rules inside it.

**Typing a Name alone does not load a font.** The Name field only changes what
`font-family` value the token holds — the browser still needs an `@font-face`
rule (or a locally installed font) that actually matches that name, or it
silently falls through to the next entry in your stack / the OS default. Use
the Source URL field, or make sure the name matches an existing hand-written
`@font-face` block in `src/styles/fontface.css` (currently: `"Inter Variable"`
and `"JetBrains Mono Variable"`, loaded from Fontsource's CDN).

`--font-heading` is a real, independently-editable token as of this addon
version. It didn't exist before: the shared `Heading` component
(`src/components/heading/heading.css.ts`) already applied a `font-heading`
Tailwind utility class to all `h1`–`h6` levels, but since `--font-heading` was
never in `global.css`'s `@theme` block, Tailwind v4 silently generated no CSS
for that utility at all — headings only ever *looked* like they used the body
font because of ordinary CSS inheritance from `<body>`'s `font-sans` rule.
`--font-heading` now defaults to the same value as `--font-sans`, so adding
the token didn't itself change any visual heading appearance — you now have to
deliberately edit it to make headings diverge from body text.

## Save & Sync

The **Save & Sync** button (`PresetManager.tsx`) posts the current tokens to
`POST /theme-sync`:

```ts
{ light: tokens, dark: DARK_MODE_OVERRIDES, fontSourceUrls, lastUpdated }
```

That single click updates three files on disk:

| File | How |
|---|---|
| `src/styles/colors.css` | Fully regenerated `:root` (light) and dark-mode blocks. |
| `src/styles/global.css` | Patched **in place** via targeted regex, one line per token (`--spacing`, `--font-heading`, `--font-sans`, `--font-mono`, `--sidebar-width*`) — the rest of the file (imports, `@layer`, `@utility` rules) is untouched. |
| `src/styles/fontface.css` | The managed `@import` block at the very top (delimited by `/* @theme-editor:imports:start */` … `:end */`) is fully regenerated from `fontSourceUrls`, deduped by URL. `@import` must precede all other rules in CSS, which is why it's injected above the hand-written `@font-face` blocks rather than appended below them. Clearing a Source URL in the UI removes its `@import` on the next save instead of leaving it behind. |

Numeric size tokens are written with a `rem` unit suffix even if untouched in
this session (a `withUnit()` guard) — this fixes a prior bug where an
unmodified `--radius`/`--spacing` default could get written unitless (e.g.
`--spacing: 0.25;`, invalid CSS) because the old code only appended a unit
when a user actually interacted with that specific control.

Every save also writes `.storybook/theme-changes.json` as a local log/backup
of the last payload sent. It's gitignored — not meant to be committed.

There is **no CLI fallback** for this anymore. The dev-server endpoint
(wired into `main.ts`'s `viteFinal`) is the only sync path; the previous
`scripts/sync-theme.js` script and its `pnpm sync-theme` command were removed
as redundant. If the endpoint can't be reached (dev server not running, or the
request fails), the button instead downloads `theme-changes.json` locally and
shows an error asking you to check the dev server and retry.

## Reset / Export / Copy CSS

- **Reset** reverts the panel to the hardcoded `DEFAULT_TOKENS` snapshot and
  clears `fontSourceUrls` — it does not touch any file on disk until you click
  Save & Sync again.
- **Export JSON** / **Copy CSS** generate a standalone preset/CSS string from
  the current in-panel state (`tokenUtils.ts`); neither writes to the repo.

## Dark mode toggle — use Storybook's, not this addon's

This addon has no light/dark toggle of its own anymore (`ThemeToggle.tsx` was
removed). It never actually worked: it called `applyTokens()`, which sets CSS
custom properties as inline styles on `document.documentElement` — but the
panel renders in Storybook's *manager* iframe, while stories render in a
separate *preview* iframe. Nothing bridges style changes between the two, so
toggling it had no visible effect on any story.

Storybook already has a real, working theme toggle in its own toolbar —
**Color Scheme** (`preview.tsx`'s `globalTypes.theme`), backed by
`withThemeProvider` in `.storybook/components/decorators.tsx`, which correctly
sets `data-theme` on the preview iframe's document. Use that toolbar control to
check how token changes look in dark mode.
