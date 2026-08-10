# Preset Engine & Dashboard — Operator's Guide

The preset system turns `src/theme/preset.json` into the design values used by
every component. This guide covers prerequisites, the preset schema, what happens
on Save, backups, and the guard that keeps components from drifting off the preset.

## Prerequisites

- **Node 22** (the monorepo pins Node 22; see the moon toolchain).
- `pnpm install` at the repo root has run once (installs `tsx`, `vitest`, and the
  rest of the workspace).

The engine modules live in `scripts/`; the dashboard lives in `src/preset/`. The
dashboard and CLI share the same `scripts/` modules (types, scales, conversion,
component-map, codegen, codemod, pipeline), so a value previewed in the dashboard
is byte-for-byte what Save writes.

## The single source of truth — `src/theme/preset.json`

Design values are **committed to git** and human-diffable. Everything rendered
(theme CSS + component `*.css.ts` files) is *derived* from it.

Two-tier model:

- **GENERAL** — applies to every component: fonts, base corner radius, type roles,
  spacing, shadows, breakpoints, animations, colors.
- **GROUP / COMPONENT** — overrides only where a component (or group) differs from
  GENERAL. Non-overridden values **inherit** the general base.
  Radius resolution order: **component → group → **base.

### Schema outline

```jsonc
{
  "info": { "name": "Client Default", "version": 1 },
  "colors": {
    "light": { "primary": "oklch(0.55 0.191 263.8)", /* … */ },
    "dark":  { "primary": "oklch(0.679 0.211 263.8)", /* same keys */ }
    // STORED AS OKLCH. Emitted verbatim into CSS vars. The dashboard color
    // pickers derive a hex for display only and never write hex back.
  },
  "fonts": {
    // fonts: "{ family, source, files }" per face.
    //   family = font-family stack for the generated utility.
    //   source = hosted URL (e.g. Google) → Save emits `@import url(...)`.
    //   files  = self-hosted .woff2 paths → Save emits `@font-face` blocks.
    //   Exactly one of source/files per face, or neither (rely on platform font).
    "heading": { "family": "…", "source": "…", "files": null },
    "body":    { "family": "…", "source": "…", "files": null },
    "mono":    { "family": "…", "source": null, "files": null }
  },
  "typeRoles": {
    "display": { "size": "3.5rem", "lineHeight": "1.1", "weight": "700", "tracking": "-0.02em" }
    // role → { size, lineHeight, weight, tracking? } (tracking optional)
  },
  "radius": { "base": { "value": "8px", "mode": "convert" } },
  "radiusGroups": {
    "button":  { "value": "9999px", "mode": "as-is" }, // opt out
    "overlay": { "shift": "2px" },                    // base + 2px
    "surface": null                                   // inherit base
  },
  "spacing": { "card-padding": { "value": "1.5rem", "mode": "convert" } },
  "shadow":  { "sm": "…", "md": "…", "lg": "…" },
  "breakpoints": { "sm": "40rem", "md": "48rem", "lg": "64rem" },
  "animation": {
    "duration": { "fast": "150ms", "base": "200ms", "slow": "300ms" },
    "easing":   { "in": "…", "out": "…", "inOut": "…" }
  },
  "components": {
    "dialog": {
      "group": "overlay",
      "radius": { "shift": "2px" },
      "sizes": { "sm": { "width": { "value": "600px", "mode": "convert" } } }
    },
    "button": { "group": "button" }
    // every component gets a group entry; overrides only where it differs
  }
}
```

### Override semantics

Every value that can opt out uses `{ value, mode }` where
`mode ∈ { "convert", "as-is" }`:

- **`convert`** — snap to the nearest Tailwind scale step (`1200px` → `max-w-6xl`,
  `13px` → `rounded-xl`, `600` → `font-semibold`). Produces standard utilities
  that are IDE-suggestable and lint-friendly.
- **`as-is`** — keep the literal value (`max-w-[1200px]`, `rounded-[13px]`).
  Written once by the codemod, never re-snapped on later saves.

**Radius three-tier (component > group > base):**

1. Component sets `{ value }` or `{ shift }` on `components.<name>.radius` → wins.
2. Else its group sets a value on `radiusGroups.<group>` → use it.
3. Else the group sets a `shift` → `base + shift`.
4. Otherwise (absent or `null`) → inherit the general base verbatim.

## How Save flows (snapshot → pipeline → write → rollback)

Whether you click **Save** in the dashboard or run `preset:*` on the CLI, the
order is always:

1. **Snapshot** — `.backup/` is written FIRST, before any write:
   - `src/theme/preset.json`
   - `src/styles/colors.css`
   - `src/styles/global.css`
   - **every** component `*.css.ts` (mirrored under `.backup/components/<dir>/`)
2. **Resolve** — validate `preset.json` (zod) and run every `{ value, mode }`
   through the conversion engine (per-mode).
3. **Apply to components** — the codemod re-tokenizes the 44 `*.css.ts` files:
   semantic utilities instead of hardcoded classes (`rounded-md` → `rounded-button`,
   `text-sm` → `text-body`, `bg-gray-900` → `bg-button-default`, …). Missing size
   variants get added (e.g. dialog `content` gains a `size` slot). Only files whose
   output actually changed are rewritten (minimal git diff; manual edits preserved
   unless they conflict).
4. **Apply to theme** — regenerate `colors.css` (light + nested dark block) and
   `global.css` (`@theme` rebuilt + static wrapper preserved verbatim).
5. **On failure** — everything written since the snapshot is **rolled back**
   from `.backup/` and the command exits non-zero.

### The untokenized-class guard

`preset:check --strict` scans every `*.css.ts` for classes that should have been
tokenized but weren't (e.g. a leftover `rounded-md`, `text-sm`, `bg-gray-*`).

- Default (`preset:check`): **warn**, exit 0. Good for a first adoption run — it
  must not red-build.
- **`--strict`**: exit 1 on any untokenized class. Wired into CI so nothing ships
  without the client design applied.

### `.backup/` restore procedure

- After a failed save: restore is automatic (taken from the last snapshot).
- Manually, to revert a save you want to undo: `preset:reset` — restores
  `preset.json` + the theme files + all component `*.css.ts` from `.backup/`.
  If no snapshot exists, it tells you to restore from git instead.

## The dashboard (dev-only)

`src/preset/` is a **Storybook-like** Vite mini-app that wraps the engine. It is
**dev-only**:

- Not part of the published package (`files: ["dist"]`).
- Never mounted in production — its Save API rewrites theme files `src/**` from a
  browser request.
- Excluded from generated projects: the scaffolder's rename loop skips
  `src/preset/**` and `src/theme/.backup/`, so re-scaffolding never breaks or
  deletes it.

Open it with `pnpm preset` (port 6100, auto-opens the browser). The UI:

- **Left rail — GENERAL**: edit fonts / radius base / type roles / breakpoints /
  durations (and it points to the color pickers in the bottom panel).
- **Center — gallery**: the real components, re-resolved live from your edits.
- **Right sidebar — component groups**, with a `●` marker on any group *or*
  component that overrides the general base.
- **Bottom panel — spec sheet**: for the focused component, inherit / create an
  override (value or base+shift), toggle Convert ⇄ Keep-as-is, add size variants,
  see the resolved class.
- **Toolbar**: light/dark preview, Save, Reset (re-read from disk).

Reactive preview is **WYSIWYG by construction** — the preview `<style>` is built
with the same per-mode `convertValue` resolution the Save pipeline uses, so what
the gallery shows is what Save writes into the theme vars.