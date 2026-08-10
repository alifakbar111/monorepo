# Design: Shared UI Preset Dashboard — Design Token System

- **Date:** 2026-08-06
- **Status:** Approved for implementation planning
- **Scope:** `packages/shared-ui` inside the `monorepo` workspace (ships with every generated project via `templates/shared-ui`)
- **Author:** brainstormed with Al-ip

## 1. Problem

`@repo/shared-ui` is a shadcn-style component library (48 components, `tailwind-variants` + Tailwind v4). The repo is used to build projects for **various clients**, each with its own Figma design. Today, matching a client's Figma means hand-editing design values **1-by-1 across all 48 components**:

- **Colors** — already tokenized (CSS vars in `styles/colors.css` + `@theme` mapping in `styles/global.css`). Changing `--primary` cascades everywhere. ✅
- **Font family** — centralized via `--font-sans`. ✅
- **Type scale / font sizes** — hardcoded Tailwind defaults: 48× `text-sm`, 13× `text-xs`, 20× `font-medium`, 14× `font-semibold` spread across files. ❌
- **Corner radius** — 32 files use `rounded-md/sm/lg/full` (27× `rounded-md`). The shared scale only supports *uniform* changes; Figma usually specifies *per-component* radii (button 8px, card 12px, dialog 13px…). ❌
- **Spacing, shadows, breakpoints, animations** — default Tailwind values, not client-driven. ❌

There is no single editable "preset" that represents a client's design.

## 2. Goals / Non-Goals

### Goals
- A developer can open a **dashboard** (feels like opening Storybook) after adding shared-ui to a project, and **update all components at once** to match a Figma design.
- **Reactive preview**: edits reflect live on a gallery of all 48 components.
- **Save** deterministically writes the design into shared-ui: components (`*.css.ts` files) + theme CSS.
- Full design-token control: colors (light + dark), typography (fonts + type scale), **one corner-radius base + per-component opt-outs/shifts**, spacing, shadows, breakpoints, animations.
- **Single active preset per project** (simple — no preset manager).
- New components added later are adopted automatically (group inheritance + re-runnable codemod + a "no component left behind" guard).
- Linter-friendly output (standard Tailwind classes where possible; `oxfmt`-formatted; minimal git churn).

### Non-Goals (v1)
- No runtime theme switching shipped to end users (dev-time tool only).
- No multi-preset management (one active preset per project checkout).
- No Figma/Token Studio import (manual entry in the dashboard forms; a paste-to-import may come later).
- No changes to Storybook itself (it keeps working; the dashboard is a separate mini-app).

## 3. Architecture Overview

```
preset.json  ──►  Dashboard mini-app (src/preset/, dev-only)
   │                     │  edits + reactive preview (injected <style>)
   │                     ▼
   │               Save pipeline (Node):
   │                 1. Resolve  — conversion engine (snap | as-is), per-mode
   │                 2. Apply to components — codemod across 44 *.css.ts
   │                 3. Apply to theme — regenerate colors.css + global.css
   ▼
src/theme/preset.json        ← single source of truth (committed, diffable)
src/components/**/*.css.ts   ← semantic token utilities (rounded-button, max-w-6xl, text-body…)
src/styles/colors.css        ← :root + dark color vars (generated)
src/styles/global.css        ← @theme block (generated) + static wrapper (base layer, keyframes)
```

> **Inventory (verified):** 48 component directories, **44** ship a `*.css.ts` (carousel, chart, spinner, squircle do not — they are not tokenization targets and carry no codemod pass). All 44 are mapped in `preset.json` `components` + `scripts/component-map.ts`; `heading` and `text` are typography components mapped to a `typography` group. `squircle` is explicitly excluded (no token surface — see §9).

**Key property:** `preset.json` is the only place design values live. Components + theme files are *derived*. Save only rewrites a file when its resolved output genuinely differs (manual hand-edits are not clobbered unless they conflict with the spec).

## 4. Token Schema — `src/theme/preset.json`

> **Two-tier design (approved after prototype v2).** There is ONE **GENERAL** section that applies to *every* component by default (fonts, base corner radius, type roles, spacing, breakpoints, animations, colors), and per-GROUP/COMPONENT **overrides** only where Figma differs. Non-overridden values inherit from GENERAL via `null` (drive from the base). This keeps the dashboard a single flow: set the Design Tokens once, then let a few groups opt out.

Single file, committed to git, human-diffable, per-project.

```jsonc
{
  "info": { "name": "Client Default", "version": 1 },

  // ────────────── TIER 1: GENERAL — applies to every component ──────────────

  // 1. Colors — full set, light + dark. STORED AS OKLCH (the format the current
  //    colors.css uses); codegen emits them into CSS vars verbatim. The dashboard
  //    color pickers convert oklch → hex for display only and never write the
  //    converted value back into the preset (see §7 "Reactive preview").
  "colors": {
    "light": { "background": "oklch(1 0 0)", "primary": "oklch(0.55 0.191 263.8)", /* …full set… */ },
    "dark":  { /* same keys, dark values */ }
  },

  // 2. Fonts — three faces, all tokenized. Each face is a { family, source, files } record:
  //      family = the font-family stack the generated utility uses.
  //      source = a hosted font CSS URL (Google/Bunny) → Save emits `@import url(...)`.
  //      files  = self-hosted woff2 paths under src/styles/fonts/ → Save emits `@font-face`.
  //      Exactly one of source/files is required (or neither → rely on the family being
  //      already loaded / platform font). The dashboard preview injects the <link> or
  //      lets Vite serve the woff2 files.
  "fonts": {
    "heading": { "family": "Sora, Inter, ui-sans-serif, system-ui, sans-serif", "source": "https://fonts.googleapis.com/css2?family=Sora:wght@400..800", "files": null },
    "body":    { "family": "Inter, ui-sans-serif, system-ui, sans-serif",         "source": "https://fonts.googleapis.com/css2?family=Inter:wght@400..600", "files": null },
    "mono":    { "family": "JetBrains Mono, ui-monospace, monospace",             "source": "https://fonts.googleapis.com/css2?family=JetBrains+Mono", "files": null }
  },

  // 3. Corner radius — ONE base knob; groups inherit unless overridden
  "radius": {
    "base": { "value": "8px", "mode": "convert" }      // emits --radius
  },

  // 4. Type roles — role-based scale (maps 1:1 to Figma text styles)
  "typeRoles": {
    "display": { "size": "3.5rem", "lineHeight": "1.1", "weight": "700", "tracking": "-0.02em" },
    "h1":      { "size": "2.25rem", "lineHeight": "1.2", "weight": "600", "tracking": "-0.02em" },
    "body":    { "size": "0.875rem", "lineHeight": "1.5", "weight": "400" },
    "caption": { "size": "0.75rem", "lineHeight": "1.5", "weight": "400", "tracking": "0.01em" }
    // … heading roles too
  },

  // 5. Spacing — shared on the 0.25rem base
  "spacing": { "base": "0.25rem" },

  // 6. Breakpoints
  "breakpoints": { "sm": "40rem", "md": "48rem", "lg": "64rem", "xl": "80rem", "2xl": "96rem" },

  // 7. Animation — durations + easings
  "animation": {
    "duration": { "fast": "150ms", "base": "200ms", "slow": "300ms" },
    "easing": { "in": "…", "out": "…", "inOut": "…" }
  },

  // 8. Shadows
  "shadow": { "sm": "…", "md": "…", "lg": "…" },

  // ────────────── TIER 2 — GROUP & COMPONENT OVERRIDES ──────────────

  // Radius: `null` → inherit GENERAL base (the default optimum). Set a value to opt this
  // group/level out. Overlay/card may express a delta from base (`base + shift`) — see §4.1.
  "radiusGroups": {
    "button":  { "value": "9999px", "mode": "as-is" },   // pill buttons
    "overlay": { "shift": "2px" },                        // overlay = base + 2px tiered system
    "card":    { "shift": "2px" },
    "surface": null                                       // inherit base (explicit)
  },

  // Component-level: same { value|null } semantics, wins over its group.
  // `radius` here is OPTIONAL — a component without one inherits its group
  // (which in turn inherits GENERAL base). `sizes` overrides sit on top of the
  // group defaults and carry { value, mode } width entries.
  "components": {
    "dialog": { "group": "overlay",
                "radius": { "shift": "2px" },
                "sizes": { "sm": { "width": { "value": "600px", "mode": "convert" } },
                           "lg": { "width": { "value": "1200px", "mode": "convert" } } } },
    "button": { "group": "button" },
    "heading": { "group": "typography" },
    "text":    { "group": "typography" }
    // …every component gets a group entry; overrides only where they differ
  }
}
```

**`radius` semantics (the "inherit" model):** the single global base lives at `radius.base`. Every group/component resolves its effective radius like so:

1. If a **component** sets `{ value }` or `{ shift }` on `components.<name>.radius` → use it (component-level override, wins over everything).
2. Else if its **group** sets `{ value }` on `radiusGroups.<group>` → use it.
3. Else if its **group** sets `{ shift }` → `base + shift` (tiered systems like overlay/card dialog on top of inputs).
4. Otherwise (absent or `null`) → inherit the global base verbatim.

Goal: `--radius` = base; `--radius-<group>` = only emitted when a group opts out; `--radius-<component>` = only emitted when a single component opts out (e.g. `--radius-dialog`). In the dashboard's spec sheet this is the **✎ set own value (create override)** ⇄ **↺ inherit** toggle; the right sidebar shows a `●` marker on any group **or component** that diverges from GENERAL.

Every overridable value that carries an explicit value uses `{ value, mode }`, `mode ∈ { "convert", "as-is" }`. The GENERAL base scales (`radius.base`, `shadow`, `breakpoints`, `fonts`) are plain values / `{ value, mode }` — they're the raw `@theme` values the generated CSS reads directly. "Inherit" is a first-class, saved state, not a UI-only concept, so a re-run keeps the opt-out.

### §4.2 How fonts load (URL or self-hosted woff2)

No manual install step — the dashboard covers both real-world cases, per face (`heading` / `body` / `mono`):

| Mode | User does | Dashboard preview | Save emits |
|---|---|---|---|
| **Hosted** | pastes the font CSS URL (Google/Bunny) into the `source` field | injects `<link rel="stylesheet" href="…">` on the fly | `@import url("…")` at the top of `global.css` |
| **Self-hosted** | drops `.woff2` files into `src/styles/fonts/` and sets `files` (paths) | Vite serves them from `src/styles/fonts/`; face resolves once the files exist | `@font-face` blocks (`font-family`, `src: url(...) format("woff2")`, `font-display: swap`) |

Rules:
- `family` is always the stack used by `--font-*` (and the fallback if neither mode is set).
- `source` and `files` are mutually exclusive per face; `null` means "not provided".
- The codemod/codegen is unchanged for components — only `global.css` gains the `@import` / `@font-face` block, so components keep referencing `font-heading` / `font-body` / `font-mono` regardless of how the face is delivered.
- A **common-families picker** in the dashboard (Inter, Sora, JetBrains Mono, …) fills `family` + a known `source` URL in one click.

### §4.1 How GROUP vs COMPONENT defaults are represented

| Level | Where it lives | What it means |
|---|---|---|
| GENERAL | `radius.base`, `fonts`, `typeRoles`… | applies to every component on that dimension |
| GROUP | `radiusGroups.<group>` | applies to every component in the group; may be `null`/absent (inherit base) |
| COMPONENT | `components.<name>.radius` + per-variant `sizes` | a single component overriding its group or the general base; component > group > base |

The dashboard shows three tiers and derives each value by inheriting down (general → group → component), exactly like the codemod does at save time.

## 5. Conversion Engine

Every design value is converted to a Tailwind class with one of two modes:

### `mode: "convert"` — snap to nearest step in Tailwind's native scale

Produces **standard classes** (IDE-suggestable, lint-friendly, minimal diff):

| Figma value | Tailwind scale step | Resolved class |
|---|---|---|
| 1200px width | `--container-6xl: 72rem (1152px)` | `max-w-6xl` |
| 600px width | `--container-xl: 36rem (576px)` | `max-w-xl` |
| 13px radius (overridden group) | `--radius-button: 0.75rem` (12px) | `rounded-button` |
| 14px font | `--text-sm: 0.875rem` | `text-sm` |
| 600 weight | `--font-weight-semibold` | `font-semibold` |
| 40px height | spacing scale (10 × 0.25rem) | `h-10` |
| 16px padding-x | spacing scale | `px-4` |

Scales supported: containers/max-width, radius, font-size, font-weight, line-height, tracking, spacing, shadow.

**Semantic radius (three-tier)**: `radius.base` emits `--radius` and the generic utility `rounded-base` for every component that *inherits*. A **group** that opts out emits its own semantic token (`--radius-button: 0.5rem` → `rounded-button`); a **component** that opts out emits `--radius-<component>` (e.g. `--radius-dialog` → `rounded-dialog`); a `shift` emits `--radius-<group>`/`--radius-<component>: calc(var(--radius) + 2px)` → `rounded-<group>`/`rounded-<component>`. The codemod writes the token once (`rounded` for inheritors, `rounded-<group>` for group outliers, `rounded-<component>` for component outliers); only theme CSS regenerates on later saves.

**Per-mode codegen rule (MANDATORY — the dashboard is WYSIWYG *by construction*):**
Every `{ value, mode }` is emitted by the codegen **through the conversion engine**, not raw:

| mode | codegen writes into the theme CSS var | preview shows | class mapping (codemod) |
|---|---|---|---|
| `convert` | the **snapped** value (e.g. `13px` → `0.75rem`, matching what the picker previews) | the snapped value | the snapped Tailwind class (`rounded-lg` → semantic `rounded-<group>`/`rounded-<component>`) |
| `as-is` | the **literal raw value** (e.g. `13px`) | the literal value | the literal arbitrary class (`rounded-[13px]`) |

Because the preview and the Save pipeline both call `convertValue` per-mode, an `as-is` value is never snapped on save and a `convert` value is never written raw — **preview and Save cannot diverge.** This replaces the earlier "WYSIWYG with Save" phrase (see §7).

### `mode: "as-is"` — keep literal value (the "Keep as-is" button)

- Class written once by the codemod, e.g. `max-w-[1200px]`, `rounded-[13px]`.
- **Never regenerated on later saves** (only theme files regenerate) → no linter/format churn.
- The theme CSS var stores the literal value (e.g. `--radius-button: 13px`), matching the preview exactly.
- Used for pixel-perfect clients where snapping is unacceptable.

The dashboard shows the resolved class *before* saving (e.g. `1200px → max-w-6xl (72rem, Δ48px)`).

## 6. Save Pipeline

Save button (or `preset:build`) runs three deterministic, idempotent steps:

1. **Resolve** — read `preset.json`, validate (zod), run every value through the conversion engine.
2. **Apply to components** — codemod across all `*.css.ts`:
   - Substitute tokenizable classes: `rounded-md` → `rounded-button`/`rounded-xl`, `max-w-lg` → `max-w-xl`/`max-w-6xl`, `text-sm` → `text-body`, `shadow-sm` → shadow token, hardcoded `bg-gray-900` → `bg-foreground`…
   - Add missing variants when the spec demands them (e.g. dialog `content` slot gains `size: { sm: "max-w-xl", lg: "max-w-6xl" }` and the component exposes a `size` prop — new props are in scope).
   - **Write only files whose resolved output changed** (minimal git diff; manual edits preserved unless they conflict).
   - Emit a **codemod report**: substitutions per file + anything it couldn't tokenize.
3. **Apply to theme** — regenerate:
   - `styles/colors.css` — `:root { light vars; &:where([data-theme="dark"], [data-theme="dark"] *) { dark vars } }`, i.e. the dark block is **nested inside `:root`** exactly like the current file (a bare sibling `&` would be a dead selector — never emit it). A **guard test** snapshots the current `colors.css` structure so a regression to sibling-emission fails.
   - `styles/global.css` — `@theme` rebuilt from `typeRoles`/`fonts`/`radius.base`/`radiusGroups`/`components`/`spacing`/`shadow`/`breakpoints`/`animation` (+ `@import url()` from hosted fonts / `@font-face` blocks from self-hosted files); static wrapper (base layer, keyframes, `@utility debug`) preserved verbatim. **The generated `@theme` must be a SUPERSET of the current file's token set** — preserve every token the preset does not own: `--color-black`, `--radius-sm/md/lg`, `--font-sans`, `--sidebar-width*`, `--spacing`, `--animate-*` + the accordion keyframes. A **guard test** diffs the current `global.css` token set against the generated output and fails if any existing token is dropped (so `rounded-md` etc. keep tracking `--radius`).

Output formatted with `oxfmt` (repo tab style). `preset.json` remains the only source of design values.

## 7. Dashboard Mini-App — `src/preset/`

Dev-only Vite mini-app bundled inside shared-ui; **not** part of the published build (`files`/build excludes it). Feels like Storybook.

**Layout (confirmed via prototype v2):**
- **Left sidebar — GENERAL (Design Tokens)**, applies to all components: ① Fonts (heading/body/mono), ② Corner radius (base knob), ③ Font sizes (typeRoles), ④ Spacing, ⑤ Breakpoints, ⑥ Animations, ⑦ Colors (light/dark). Edits here cascade to every component.
- **Center canvas** — gallery of the selected group/component, rendered with the *real* components from the package (exactly what ships).
- **Right sidebar** — component groups list (Buttons, Inputs & Forms, Overlays, Cards, Badges & Avatars, Surfaces & Data, Typography). A `●` dot marks a **group** with an override; each **component** row carries its own `●` when `components.<name>.radius`/`sizes` override the group. Un-adopted components show a "not yet adopted" notice.
- **Bottom panel** — spec sheet for the current selection:
  - *Component selected* → its spec: **per-component** inheritance across attribute rows (radius / width / height / padding, per variant) with Figma-value input + **Convert ⇄ Keep-as-is** toggle + **✎ set own value (create override) ⇄ ↺ inherit** + live resolved-class preview. Editing a row writes `components.<name>` (or `radiusGroups.<group>` only when the user explicitly chooses "edit whole group") — it never silently re-radiuses the 9 siblings of a group. Inherit / `{value}` / `{shift}` are all first-class saved states.
  - *Design Tokens selected (left sidebar)* → GENERAL editors: colors (light/dark pickers), **fonts (heading/body/mono, each with family + a hosted URL or self-hosted woff2 + common-family quick pick)**, `typeRoles` table, radius base, spacing, breakpoints, animations.
- **Toolbar** — light/dark preview toggle, **Save**, Reset-to-default.

**Reactive preview:** every edit updates an in-memory working copy of the preset (nanostores — already a dependency) and injects a live `<style>` override (`:root { --primary: …; --radius-button: 0.5rem }`). Components reference semantic tokens, so the gallery re-resolves instantly. **WYSIWYG is guaranteed by construction:** the preview *is* the same per-mode `convertValue` resolution the Save pipeline applies (see §5 "Per-mode codegen rule") — what the gallery shows is byte-for-byte what Save writes into the theme vars. **Color pickers:** `<input type="color">` needs hex, but the preset stores oklch. The picker value is a **derived getter**: `oklch → rgb → hex` for display only; the picker never writes the converted value back into the preset. If the user picks a new color, the preset stores **oklch written back from the picker** (round-trip-safe oklch parsing) — an oklch value never silently becomes a hex mid-gray.

**Template exclusion:** `src/preset/` is **dev-only and must NOT ship in generated projects**. The template pipeline (`builder/shared-ui.sh`) renames all `*.tsx` → `*.raw.tsx`; it must exclude `src/preset/**` (or the dashboard's `main.tsx` becomes `main.raw.tsx` and the generated project's dashboard is dead). The builder exclusion is a hard requirement of this spec (see §12 risk row).

**New components:** appear in the sidebar automatically (scan of `src/components`). Un-adopted components show group defaults + a "not yet adopted" notice; Save adopts them.

## 8. Scripts

| Script | Purpose |
|---|---|
| `pnpm preset` | Open dashboard (Vite dev server + Node middleware: `GET/POST /api/preset`, `POST /api/save` running the pipeline) |
| `pnpm preset:build` | Headless: resolve → apply theme → write files (CI / no-dashboard projects) |
| `pnpm preset:codemod` | One-time/adoption conversion of all `*.css.ts` to semantic tokens; interactive group classification for new components |
| `pnpm preset:check` | "No component left behind" guard (see §9); wired into CI |
| `pnpm preset:reset` | Restore default `preset.json` |

Safety: zod schema validation on save; **`.backup/` snapshot taken BEFORE any write — `preset.json`, `colors.css`, `global.css`, and every `*.css.ts` the codemod will touch** (restore-all on failure); codemod report on every run.

## 9. New Component Adoption

1. Developer adds a shadcn-style component with hardcoded classes, as usual.
2. `pnpm preset:codemod` (or Save — auto-detects untokenized files):
   - Detects the new `*.css.ts` via the untokenized-class scan (component dirs with **no** `*.css.ts` — carousel, chart, spinner, squircle — are not candidates and are skipped).
   - Classifies it: name heuristics (`pagination` → button-ish); ambiguous → prompts once: "`pagination` — which group? [Buttons/Inputs/Overlays/Cards/Badge/New…]".
   - Adds a `components` entry (inheriting group defaults), tokenizes the css.ts, reports it.
3. **Guard — `preset:check`** (wired into the shared-ui moon task graph / CI): scans every `*.css.ts` for untokenized classes and **prints them as warnings; exits 0** by default (a first adoption run must not red-build). Pass `--strict` in CI after the codemod has run → exits 1 on any untokenized class, so nothing ships ignoring the client design.

The initial adoption of the existing 44 css.ts-bearing components is the same path: codemod runs, generates the first `groups`/`components` map from the classes already in the files. `squircle` is **explicitly excluded** from the map (it has no `*.css.ts` to tokenize; it consumes group/surface tokens via its `.tsx` demo).

## 10. End-to-End Workflow

```
1. create project (degit template)      → shared-ui included, default preset.json
2. pnpm install
3. cd packages/shared-ui && pnpm preset:codemod   ← one-time adoption
4. pnpm preset                           → dashboard opens (Storybook-like)
5. Open Figma side-by-side; fill in:
     **Design Tokens (GENERAL)** → colors (light+dark), fonts (heading/body/mono), radius base, type scale, shadows, breakpoints, animations
     **Each component** → spec sheet (radius/width/height/padding) from Figma; opt out of the base radius only where it differs
6. Gallery reacts live; flip Convert ⇄ Keep-as-is per value
7. Save                                   → preset.json + 44 css.ts + theme CSS all updated
8. pnpm build, ship                       → project matches Figma everywhere
```

New client later: redo 4–7, or copy the client's saved `preset.json` in and run `preset:build`.

## 11. Testing

| Layer | Approach |
|---|---|
| Conversion engine | Unit tests: scale steps × values → expected class (snap + as-is cases); per-mode parity (convert saves snapped, as-is saves literal) |
| Codegen | Unit tests: `preset.json` → exact `colors.css`/`global.css`; idempotency (twice = same bytes); **dark-block snapshot** against current `colors.css`; **token-superset guard** diffing current `global.css` token set (no token dropped); per-component radius resolution |
| Codemod | Unit tests: per-component mapping + variant addition; idempotency; "no component left behind" check |
| oklch round-trip | Unit tests: oklch → hex → oklch preserves the stored value; picker never writes hex back |
| Dashboard | Manual: open, edit, save, rebuild, visual verify in a consuming app |
| Regression | Storybook renders all 44 css.ts components after codemod (Vitest snapshot/visual) |

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tailwind v4 may not re-resolve some utilities live from var overrides (`text-*` sizes) | Spike on day 1 to verify var-reactivity; fallback: preview injects concrete class overrides |
| Codemod mis-maps a class (wrong radius on a component) | Codemod report lists every substitution; Storybook visual pass after adoption |
| Hand-edited components get clobbered | Save rewrites only files whose output differs; **`.backup/` snapshot taken before any write, covering all `*.css.ts` as well**; restore-all on failure |
| Linter/format churn on as-is classes | as-is values written once, never regenerated; output oxfmt-formatted |
| Dashboard accidentally shipped in the published package | `src/preset/` dev-only, excluded from build + `files` |
| Dashboard killed in generated projects | **Builder exclusion:** `builder/shared-ui.sh` must skip `src/preset/**` (its `find "$TARGET_PATH" -type f -name "*.tsx"` → `*.raw.tsx` would turn `src/preset/main.tsx` into `main.raw.tsx` and kill the dashboard); `src/preset` is dev-only and is excluded from the template pipeline |
| New components silently ignore the preset | Untokenized-class scan + `preset:check` wired into the shared-ui moon task graph / CI (`--strict` in CI) |
| oklch values silently destroyed | color pickers convert oklch→hex for display only; preset always stores oklch; round-trip-safe write-back |

## 13. Open Items / Spike (Day 1)

- Verify Tailwind v4 utility var-reactivity for `text-*` (and `shadow-*`) utilities — determines whether the preview relies purely on var overrides or also injects concrete class overrides.
- ~~Decide hex vs oklch for emitted color vars~~ **RESOLVED:** oklch is stored/labeled as-is (matches the current `colors.css`); the dashboard converts oklch→hex for display only and never writes the converted value back (see §7).

## 14. For Agentic Workers — REQUIRED: Delegate Agents

Implementation of this design MUST be executed via **subagent-driven development**:

- Do NOT implement everything in one agent context. Delegate each unit of work to the appropriate specialist agent.
- Routing (see orchestrator-agent table):
  - **planner-agent** — write the implementation plan first (this spec's successor)
  - **backend-agent** — the save pipeline (resolve → codemod → codegen) + Node middleware
  - **frontend-agent** — the dashboard mini-app (`src/preset/`), spec-sheet UI, gallery
  - **db-migration-agent** — n/a (no database); skip
  - **tester-agent** — conversion-engine, codegen, and codemod test suites + regression
  - **code-reviewer-agent** — after every non-trivial task, before commit
  - **security-auditor-agent** — before any user-facing/network-touching surface (the save API writes files to disk — treat as privileged)
  - **technical-writer-agent** — update shared-ui README + `templates/shared-ui` docs with the new scripts
- Independent tasks (different files) fan out in parallel; same-file tasks serialize.
- Verify per task with the repo's check commands (`pnpm typecheck`, `pnpm lint`/`oxlint`, tests).
- Commit style: single-line conventional commits (repo rule), one unit of work per commit.
- The day-1 **spike** (var-reactivity verification) is itself a task — assign it to a general/explore agent before any codegen work, and gate the preview architecture on its result.

