# Shared UI Library

This is a shared UI library, a comprehensive collection of React components built with
modern web development best practices. Under the hood, it uses Tailwind CSS, Radix UI,
and TypeScript to deliver accessible, type-safe, and customizable components.

The UI components leverage [shadcn/ui](https://ui.shadcn.com/) as their foundation,
enhanced with custom modifications. The notable distinction lies in the styling
implementation, which utilizes [Tailwind Variants](https://www.tailwind-variants.org/)
for a more flexible approach and [tailwindcss-motion](https://rombo.co/tailwind) for
animations and transitions effects.

## Enabling the package

Add the following to your `package.json` file:

```json
{
    "dependencies": {
        "@repo/shared-ui": "workspace:*"
    },
    "devDependencies": {
        "@tailwindcss/vite": "^4.1.4",
        "tailwind-variants": "^1.0.0",
        "tailwindcss-motion": "^1.1.0",
        "tailwindcss": "^4.1.5",
    }
}
```

Add the following to your `tsconfig.json` file:

```json
{
    "references": [{ "path": "../../packages/shared-ui" }]
}
```

Exclude internal packages from optimization, add the following to your `vite.config.ts` file:

```ts
export default defineConfig({
  // ...
  optimizeDeps: {
    // Do not optimize internal workspace dependencies.
    exclude: ['@repo/shared-ui'],
  },
})
```

Add `shared-ui` source list to `global.css`:

```css
@source "../../../../packages/shared-ui/**/*.{ts,tsx}";
```

Finally, add the following to your `moon.yml` file:

```yaml
dependsOn:
  - 'shared-ui'
```

---

## Preset Engine & Dashboard

The design (colors, typography, fonts, corner-radius base + per-group opt-outs + per-component overrides, spacing, shadows, breakpoints, animations) is driven by one committed source of truth: `src/theme/preset.json`. An **engine** (`scripts/`) reads it and regenerates the theme files (`src/styles/colors.css`, `src/styles/global.css`) and re-tokenizes all 44 component `*.css.ts` files. A **dashboard** (`src/preset/`) wraps the engine so you can edit **GENERAL** properties (apply to all components) and **per-component overrides**, preview live, then **Save** to regenerate. Full operator's guide: [`docs/preset-engine.md`](docs/preset-engine.md).

> **DEV-ONLY — never mount in production.** The dashboard (`src/preset/**`) is excluded from the published package and must never be enabled in a production build: its save API rewrites theme files (`preset.json`, `*.css.ts`, generated CSS) from a browser request. Scaffolding scripts (`builder/shared-ui.sh`) skip `src/preset/**` so a re-scaffold never deletes it.

### Run the dashboard

```bash
# from the repo root (any project you're in)
pnpm --filter @repo/shared-ui preset

# or from inside packages/shared-ui
pnpm preset
```

Vite dev server on **port 6100** (auto-opens the browser). What you'll see:

- **Left rail** — GENERAL properties: fonts (heading/body/mono), corner radius base, type roles, breakpoints, animation durations, colors (pickers live in the bottom panel).
- **Right sidebar** — component groups; a `●` marker shows a group *or* component that overrides the general base.
- **Bottom panel** — per-component spec sheet: inherit / create an override (value or base+shift), toggle **Convert ⇄ Keep-as-is**, add size variants, see the resolved class.
- **Toolbar** — light/dark toggle, **Save**, reset-to-disk.

Edits re-resolve the gallery live (WYSIWYG by construction — the preview uses the same per-mode conversion the save pipeline runs). **Save** writes `preset.json`, regenerates the theme files, and re-tokenizes component css.ts — all rolled back automatically if anything fails.

The preset lives at `src/theme/preset.json`; pre-write snapshots go to `src/theme/.backup/`.

### Headless scripts (CI / no-dashboard use)

```bash
pnpm --filter @repo/shared-ui preset:build     # regenerate theme CSS from preset.json (CI)
pnpm --filter @repo/shared-ui preset:codemod   # re-tokenize all 44 *.css.ts from the preset
pnpm --filter @repo/shared-ui preset:check     # warn on untokenized classes (--strict fails)
pnpm --filter @repo/shared-ui preset:reset     # restore preset.json + css.ts + theme files from .backup/
```

| Script | Does | When to use |
|---|---|---|
| `preset` | Open the design dashboard (Vite on `:6100`) | Interactive editing, previewing, saving |
| `preset:build` | Resolve preset → generate `colors.css` + `global.css` → write theme files | CI / headless theme regeneration |
| `preset:codemod` | Re-tokenize all 44 component css.ts to semantic tokens (adds new-component adoption) | Initial adoption; after adding components; re-runnable |
| `preset:check` | Warn on untokenized classes; `--strict` exits 1 | "No component left behind" guard, wired into CI with `--strict` |
| `preset:reset` | Restore the last `.backup/` snapshot (theme + css.ts) | Undo a save you want to revert |

Run from inside the package the same way (`pnpm preset:check --strict`).

### Tests + typecheck

```bash
pnpm --filter @repo/shared-ui test         # vitest (^4.1.2)
pnpm --filter @repo/shared-ui typecheck    # tsc --noEmit (covers scripts/, tests/, src/preset)
```

### Workflow — match a client's Figma

1. `pnpm --filter @repo/shared-ui preset:codemod` — one-time: tokenizes all components (safe to re-run; adopts new components too).
2. `pnpm --filter @repo/shared-ui preset` → dashboard opens on `:6100`. Edit the left **GENERAL** rail once (fonts, radius base, type scale, colors…); the gallery previews live.
3. Per component, the bottom spec sheet lets you **inherit** the radius (**GENERAL base → group → component**) or **✎ create an override** (value or base+shift) on the selected component only — siblings are never touched. Every value has **Convert** (snap to nearest Tailwind step) or **Keep as-is** (literal, pixel-perfect).
4. Click **Save** — snapshots the current theme files (incl. every `*.css.ts`) FIRST, then writes `preset.json`, rewrites the changed `*.css.ts` and regenerates the theme CSS; on failure everything is rolled back.
5. `git diff src/styles/global.css` → the radius token (`--radius`, `--radius-dialog`) reflects your change.
6. `git add` the changed files and commit.
