# Shared UI Preset System — Core Engine + CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Per spec §14: delegate each task to the right specialist agent (backend-agent for engine/codemod/codegen, tester-agent for test suites, code-reviewer-agent after every non-trivial task), verify with `pnpm typecheck`/`lint`/tests, commit single-line conventional commits, one unit of work per commit.

**Goal:** Build the headless core of the shared-ui preset system — `preset.json` as single source of truth, a conversion engine (snap-to-scale or keep-as-is), a codegen that regenerates `colors.css` + `global.css`, and a codemod that tokenizes all 44 `*.css.ts` files — plus the `preset:build` / `preset:codemod` / `preset:check` / `preset:reset` CLI scripts and their test suites.

**Architecture:** `src/theme/preset.json` is the only place design values live. `scripts/` contains pure TS modules (types, scales, conversion, component-map, codegen, codemod, pipeline) run via `tsx`; the dashboard (separate plan) reuses the same modules through the pipeline. Components reference semantic token utilities (`rounded-button`, `max-w-dialog-lg`, `text-body`) whose values live in generated `@theme` CSS. The default preset mirrors the current design 1:1 (44 css.ts components mapped; `carousel`, `chart`, `spinner`, `squircle` have no css.ts and are not tokenization targets).

**Tech Stack:** TypeScript ~6.0.2 (compiler API for the codemod), zod 4 (already a dep), vitest 4.1.2 (installed; pin `^4.1.2`), tsx, Tailwind v4, oxfmt/oxlint, Node 22.

**Spec:** `docs/superpowers/specs/2026-08-06-shared-ui-preset-dashboard-design.md`

---

## File Structure

```
packages/shared-ui/
├── src/
│   ├── theme/
│   │   ├── preset.json                     # CREATE — default preset (source of truth)
│   │   └── .backup/                        # CREATE (at runtime) — pre-write snapshot
│   ├── styles/
│   │   ├── colors.css                      # MODIFY — becomes generated output
│   │   └── global.css                      # MODIFY — becomes generated output (static wrapper kept)
│   └── components/**/*.css.ts              # MODIFY — tokenized by the codemod (44 files)
├── scripts/
│   ├── types.ts                            # CREATE — zod schemas + inferred types for preset.json
│   ├── scales.ts                           # CREATE — Tailwind v4 scale tables + snap helpers
│   ├── conversion.ts                       # CREATE — conversion engine ({value,mode} → resolved)
│   ├── component-map.ts                    # CREATE — component name → group + radius resolution (component > group > base)
│   ├── codegen.ts                          # CREATE — preset → colors.css + global.css strings (per-mode, superset)
│   ├── codemod.ts                          # CREATE — TS AST transformer for *.css.ts files
│   ├── pipeline.ts                         # CREATE — snapshot + resolve + codegen + codemod orchestration
│   ├── cli-build.ts                        # CREATE — `preset:build` entry
│   ├── cli-codemod.ts                      # CREATE — `preset:codemod` entry (adoption)
│   ├── cli-check.ts                        # CREATE — `preset:check` guard (warn by default, --strict fails)
│   └── cli-reset.ts                        # CREATE — `preset:reset` entry
├── tests/
│   ├── types.test.ts                       # CREATE
│   ├── conversion.test.ts                  # CREATE
│   ├── codegen.test.ts                     # CREATE
│   ├── codemod.test.ts                     # CREATE
│   └── fixtures/
│       ├── colors.css.golden               # CREATE — copy of current src/styles/colors.css
│       └── global.css.golden               # CREATE — copy of current src/styles/global.css
├── vitest.config.ts                        # CREATE
└── tsconfig.json                           # MODIFY — Task 0 (include scripts/tests; drop baseUrl)
```

---

## Task 0: Typecheck gate — make `tsc --noEmit` genuinely cover the code it must

**Why first:** `packages/shared-ui/tsconfig.json` today has `"include": ["src", ".storybook"]` — everything these plans create (`scripts/`, `tests/`, `vitest.config.ts`) is outside that glob, so none of it was ever typechecked. Worse, `src/preset/**` will import `../../scripts/types`, which with `composite: true` is a hard TS6307 (project-reference violation). And the gate is red even on current code: `baseUrl` is deprecated in TS 6 (TS5101) and two `.stories.tsx` files fail. Task 0 fixes all of it so every later task's "Expected: typecheck clean" is true by construction.

**Files:**
- Modify: `packages/shared-ui/tsconfig.json`
- Modify: `packages/shared-ui/src/components/button/button.stories.tsx`
- Modify: `packages/shared-ui/src/components/toggle-group/toggle-group.stories.tsx`
- Modify: `packages/shared-ui/package.json` (devDeps only — add `vitest`)

- [ ] **Step 1: Fix the tsconfig**

`packages/shared-ui/tsconfig.json`:

```jsonc
{
	"compilerOptions": {
		// remove the deprecated `"baseUrl": "."` line (TS5101 in TS 6; nothing uses it — no `paths` mapping exists)
		"allowJs": true,
		"allowSyntheticDefaultImports": true,
		"composite": true,
		"declaration": true,
		"declarationDir": "dist",
		"declarationMap": true,
		"esModuleInterop": true,
		"inlineSources": true,
		"isolatedModules": true,
		"jsx": "react-jsx",
		"lib": ["DOM", "DOM.Iterable", "ESNext"],
		"module": "esnext",
		"moduleResolution": "bundler",
		"preserveSymlinks": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"target": "esnext",
		"tsBuildInfoFile": "node_modules/tsconfig.tsbuildinfo",
		"verbatimModuleSyntax": true
	},
	// scripts + tests + vitest.config.ts were previously NOT included → untypechecked.
	// Adding them keeps a SINGLE composite project: `src/preset/**` → `../../scripts/types`
	// imports now resolve inside the same project's file list → TS6307 is gone (no separate
	// project reference or paths mapping needed).
	// `src` is a RECURSIVE glob, so it covers every file later tasks edit: all 44
	// `components/**/*.css.ts` (incl. `toggle-group/toggle-group.css.ts`), every
	// `.stories.tsx` (incl. `toggle-group/toggle-group.stories.tsx` — the second file
	// Task 0 Step 3 fixes), and `toggle-group/toggle-group.tsx`. Do NOT narrow this
	// list without re-adding those files, or the widened gate silently stops covering
	// the very files these plans modify.
	"include": ["src", "scripts", "tests", "vitest.config.ts", ".storybook"],
	"exclude": ["node_modules", "build", "dist", "dist-preset", "storybook-static", "tmp"]
}
```

> The `typecheck` script (`"typecheck": "tsc --noEmit"` in package.json) is already correct — it now genuinely covers `scripts` + `tests` + `src` once the include glob widens. No new script needed.

- [ ] **Step 2: Add vitest to devDependencies (needed for `tests/` to typecheck)**

In `packages/shared-ui/package.json` `devDependencies` add:

```json
		"vitest": "^4.1.2"
```

Then run: `pnpm install` (from repo root). Expected: install completes, vitest 4.1.2 lands in `node_modules` (already installed today — verify `pnpm why vitest`).

> Why `^4.1.2`: it is the version already installed and its peer `vite` is `^8`, matching this package's pinned `vite ~8.0.3`. The plan's earlier `^3.2.4` pin was incompatible — do not regress to it.

- [ ] **Step 3: Fix the two pre-existing type errors the gate currently trips on**

`src/components/button/button.stories.tsx` (line ~154): the `Github` icon was removed from `lucide-react` v1.6. Replace:

```tsx
<Lucide.Github className="-ml-0.5" />
```

with an icon that still exists:

```tsx
<Lucide.GitBranch className="-ml-0.5" />
```

`src/components/toggle-group/toggle-group.stories.tsx`: the component's props type is `React.ComponentPropsWithoutRef<"div"> & ToggleVariants` — it does not accept `type="multiple" | "single"`. Fix in `src/components/toggle-group/toggle-group.tsx` by extending the props type (the value already reaches Radix via `...props`):

```tsx
type ToggleGroupProps = React.ComponentPropsWithoutRef<"div"> & ToggleVariants & {
	/** @radix-ui/react-toggle-group: "single" | "multiple" (defaults to "single") */
	type?: "single" | "multiple";
};
```

- [ ] **Step 4: Verify the gate is green**

Run: `pnpm --filter @repo/shared-ui typecheck`
Expected: clean (no TS5101, no TS2339 on stories, no TS6307 once scripts/tests are included). This is the baseline every later task's "typecheck clean" builds on.

- [ ] **Step 5: Commit**

`package.json` and `pnpm-lock.yaml` carry pre-existing unrelated uncommitted changes. Use `git add -p` so ONLY the two intended hunks stage (the `vitest` devDep + the tsconfig/`.stories.tsx` fixes), never the unrelated edits:

```bash
git add tsconfig.json src/components/button/button.stories.tsx src/components/toggle-group/toggle-group.tsx src/components/toggle-group/toggle-group.stories.tsx
git add -p package.json           # stage only the `"vitest": "^4.1.2"` devDep hunk
git commit -m "chore(shared-ui): fix typecheck gate to cover scripts and tests"
```

> Do NOT run `git add pnpm-lock.yaml` — `pnpm install` may have touched it; the implementing user reconciles that file at merge time.

---

## Task 1: Spike — verify Tailwind v4 behaviors the whole system depends on

Delegated to an **explore/general agent** (spec §14). This task gates every later task; do not proceed until it reports.

**Files:**
- Modify: `packages/shared-ui/src/styles/global.css` (temporary additions, reverted after)
- Create: `packages/shared-ui/src/components/spike/spike.stories.tsx` (temporary, deleted after)

- [ ] **Step 1: Add temporary `@theme` tokens to global.css**

Append inside the existing `@theme { }` block:

```css
	/* SPIKE — remove after verification */
	--text-spike: 1.25rem;
	--text-spike--line-height: 1.75rem;
	--radius-spike: 0.75rem;
	--container-spike: 36rem;
	--shadow-spike: 0 1px 3px 0 rgb(0 0 0 / 0.1);
	--spacing-spike: 1.5rem;
	--color-spike: oklch(0.55 0.191 263.8);
```

- [ ] **Step 2: Create a spike story that exercises every token type**

Create `src/components/spike/spike.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
	title: "SPIKE/Reactivity",
	parameters: { layout: "centered" },
} satisfies Meta;

export default meta;

export const Tokens: StoryObj = {
	render: () => (
		<div
			id="spike-box"
			className="rounded-spike text-spike max-w-spike shadow-spike p-spike bg-spike"
		>
			SPIKE — resize me in devtools
		</div>
	),
};
```

- [ ] **Step 3: Run Storybook and verify utility generation**

Run: `pnpm --filter @repo/shared-ui storybook` (from `packages/shared-ui`: `pnpm storybook`)
Open `http://localhost:6006`, navigate to **SPIKE/Reactivity → Tokens**.

Expected: the box renders with border-radius 0.75rem, font-size 1.25rem, line-height 1.75rem, max-width 36rem, shadow, padding 1.5rem, bg = the oklch color. If any utility class is missing, record which `--*` key namespace failed (this determines the exact codegen syntax).

- [ ] **Step 4: Verify live var-override reactivity**

In devtools console, run:

```js
const s = document.createElement("style");
s.textContent = ":root { --text-spike: 3rem; --radius-spike: 2rem; --container-spike: 48rem; --shadow-spike: 0 10px 20px rgb(0 0 0 / 0.5); --spacing-spike: 3rem; --color-spike: red; }";
document.head.appendChild(s);
```

Expected: font-size, border-radius, max-width, shadow, padding, background all change **without reload**. Record which ones do NOT change — those need the concrete-class-override fallback in the dashboard preview (documented, not blocking).

- [ ] **Step 5: Verify named spacing utilities**

Add `--spacing-spike-h: 2.5rem;` to the spike `@theme` block and in the story change `p-spike` to also include `h-spike-h`. Expected: element height = 2.5rem. If `h-spike-h` is not generated, note it — the codegen must then emit heights as `h-[var(--spacing-<key>)]`.

- [ ] **Step 6: Record results and revert**

Write findings to `docs/superpowers/specs/2026-08-06-shared-ui-preset-dashboard-design.md` §13 (replace the open item with verified behavior). Delete `src/components/spike/` and the SPIKE lines from `global.css`.

Run: `pnpm --filter @repo/shared-ui typecheck` — expected: clean.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "docs(shared-ui): record tailwind v4 token reactivity spike results"
```

---

## Task 2: Default `preset.json` + zod schema

**Files:**
- Create: `packages/shared-ui/src/theme/preset.json`
- Create: `packages/shared-ui/scripts/types.ts`
- Test: `packages/shared-ui/tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";

describe("preset.json", () => {
	it("parses against the schema", () => {
		const raw = readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8");
		const result = presetSchema.safeParse(JSON.parse(raw));
		expect(result.success).toBe(true);
		if (!result.success) console.error(result.error.format());
	});

	it("has light and dark color sets with the same keys", () => {
		const raw = readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8");
		const preset = presetSchema.parse(JSON.parse(raw));
		expect(Object.keys(preset.colors.light).sort()).toEqual(
			Object.keys(preset.colors.dark).sort(),
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — `Cannot find module '../scripts/types'`.

- [ ] **Step 3: Create the schema module**

Create `scripts/types.ts`:

```ts
import { z } from "zod";

export const tokenValueSchema = z.object({
	value: z.string(),
	mode: z.enum(["convert", "as-is"]),
});
export type TokenValue = z.infer<typeof tokenValueSchema>;

// Radius override (three-tier: component > group > base): sets { value, mode } (opts out),
// { shift } (base+delta), or is ABSENT / null → inherit the next tier up.
export const radiusOverrideSchema = z
	.union([
		z.null(),
		z.object({ value: z.string(), mode: z.enum(["convert", "as-is"]) }),
		z.object({ shift: z.string() }),
	])
	.optional();
export type RadiusOverride = z.infer<typeof radiusOverrideSchema>;

// Font face: family stack + hosted URL (source) OR self-hosted woff2 paths (files), or neither.
export const fontFaceSchema = z.object({
	family: z.string(),
	source: z.string().nullish(),
	files: z.array(z.string()).nullish(),
});
export type FontFace = z.infer<typeof fontFaceSchema>;

const sizeEntrySchema = z.record(z.unknown());

export const presetSchema = z.object({
	info: z.object({ name: z.string(), version: z.number() }),
	colors: z.object({
		light: z.record(z.string()),
		dark: z.record(z.string()),
	}),
	// Tier 1 — GENERAL fonts (three faces enforced); each is family + host mode
	fonts: z.object({
		heading: fontFaceSchema,
		body: fontFaceSchema,
		mono: fontFaceSchema,
	}),
	typeRoles: z.record(
		z.object({
			size: z.string(),
			lineHeight: z.string(),
			weight: z.string(),
			tracking: z.string().optional(),
		}),
	),
	radius: z.object({ base: tokenValueSchema }),
	// Tier 2 — group radius overrides (null/shift/value; absent = inherit GENERAL base)
	radiusGroups: z.record(radiusOverrideSchema),
	spacing: z.record(z.union([tokenValueSchema, z.unknown()])),
	shadow: z.record(z.string()),
	breakpoints: z.record(z.string()),
	animation: z.object({
		duration: z.record(z.string()),
		easing: z.record(z.string()),
	}),
	// Three-tier: a component inherits its GROUP (which inherits GENERAL base) unless
	// `components.<name>.radius` opts out (component > group > base). `radius` reuses the
	// same null/value/shift union as radiusGroups; `sizes` carry per-variant widths.
	components: z.record(
		z
			.object({
				group: z.string(),
				radius: radiusOverrideSchema, // optional — inherit group/base when absent
				sizes: z
					.record(
						z.object({
							width: tokenValueSchema,
						}),
					)
					.optional(),
			})
			.passthrough(),
	),
});

export type Preset = z.infer<typeof presetSchema>;
export type ColorSet = Preset["colors"]["light"];
export type TypeRole = Preset["typeRoles"][string];
```

- [ ] **Step 4: Create the default preset**

Create `src/theme/preset.json` — values mirror the CURRENT design (from `src/styles/colors.css` + `global.css`) so the first save is visually a no-op. Colors keep their current oklch strings verbatim:

```json
{
	"info": { "name": "Default", "version": 1 },
	"colors": {
		"light": {
			"background": "oklch(1 0 0)",
			"foreground": "oklch(0.25 0.008 255.21)",
			"primary": "oklch(0.55 0.191 263.8)",
			"primary-foreground": "oklch(0.98 0.003 252.11)",
			"secondary": "oklch(0.95 0.005 252.11)",
			"secondary-foreground": "oklch(0.25 0.008 252.11)",
			"destructive": "oklch(0.589 0.199 27.84)",
			"destructive-foreground": "oklch(0.99 0.001 253.77)",
			"card": "oklch(1 0 0)",
			"card-foreground": "oklch(0.15 0.011 252.11)",
			"popover": "oklch(1 0 0)",
			"popover-foreground": "oklch(0.15 0.011 252.11)",
			"muted": "oklch(0.95 0.005 252.11)",
			"muted-foreground": "oklch(0.55 0.015 252.11)",
			"accent": "oklch(0.95 0.005 252.11)",
			"accent-foreground": "oklch(0.25 0.008 252.11)",
			"border": "oklch(0.89 0.008 252.11)",
			"input": "oklch(0.89 0.008 252.11)",
			"ring": "oklch(0.25 0.008 252.11)",
			"sidebar-background": "oklch(0.98 0.003 252.11)",
			"sidebar-foreground": "oklch(0.35 0.015 252.11)",
			"sidebar-primary": "oklch(0.25 0.008 252.11)",
			"sidebar-primary-foreground": "oklch(0.98 0.003 252.11)",
			"sidebar-accent": "oklch(0.95 0.005 252.11)",
			"sidebar-accent-foreground": "oklch(0.25 0.008 252.11)",
			"sidebar-border": "oklch(0.89 0.015 251.27)",
			"sidebar-ring": "oklch(0.65 0.191 263.8)",
			"chart-1": "oklch(0.639 0.199 27.84)",
			"chart-2": "oklch(0.513 0.128 194.68)",
			"chart-3": "oklch(0.329 0.082 220.93)",
			"chart-4": "oklch(0.689 0.193 85.59)",
			"chart-5": "oklch(0.689 0.224 44.94)",
			"success": "oklch(0.571 0.191 143.8)",
			"success-foreground": "oklch(0.98 0.003 253.77)",
			"info": "oklch(0.571 0.191 263.8)",
			"info-foreground": "oklch(0.98 0.003 253.77)",
			"warning": "oklch(0.571 0.191 83.8)",
			"warning-foreground": "oklch(0.98 0.003 253.77)",
			"error": "oklch(0.589 0.199 27.84)",
			"error-foreground": "oklch(0.98 0.003 252.11)",
			"button-default": "oklch(0.25 0.008 255.21)",
			"button-default-foreground": "oklch(1 0 0)"
		},
		"dark": {
			"background": "oklch(0.15 0.011 252.11)",
			"foreground": "oklch(0.98 0.003 252.11)",
			"primary": "oklch(0.679 0.211 263.8)",
			"primary-foreground": "oklch(0.25 0.008 252.11)",
			"secondary": "oklch(0.28 0.008 252.11)",
			"secondary-foreground": "oklch(0.98 0.003 252.11)",
			"destructive": "oklch(0.589 0.199 27.84)",
			"destructive-foreground": "oklch(0.99 0.001 253.77)",
			"card": "oklch(0.15 0.011 252.11)",
			"card-foreground": "oklch(0.98 0.003 252.11)",
			"popover": "oklch(0.15 0.011 252.11)",
			"popover-foreground": "oklch(0.98 0.003 252.11)",
			"muted": "oklch(0.28 0.008 252.11)",
			"muted-foreground": "oklch(0.65 0.015 252.11)",
			"accent": "oklch(0.28 0.008 252.11)",
			"accent-foreground": "oklch(0.98 0.003 252.11)",
			"border": "oklch(0.28 0.008 252.11)",
			"input": "oklch(0.28 0.008 252.11)",
			"ring": "oklch(0.85 0.008 252.11)",
			"sidebar-background": "oklch(0.18 0.003 252.11)",
			"sidebar-foreground": "oklch(0.95 0.005 252.11)",
			"sidebar-primary": "oklch(0.55 0.191 263.8)",
			"sidebar-primary-foreground": "oklch(1 0 0)",
			"sidebar-accent": "oklch(0.28 0.008 252.11)",
			"sidebar-accent-foreground": "oklch(0.95 0.005 252.11)",
			"sidebar-border": "oklch(0.28 0.008 252.11)",
			"sidebar-ring": "oklch(0.65 0.191 263.8)",
			"chart-1": "oklch(0.571 0.191 263.8)",
			"chart-2": "oklch(0.571 0.128 194.68)",
			"chart-3": "oklch(0.571 0.199 27.84)",
			"chart-4": "oklch(0.571 0.161 14.18)",
			"chart-5": "oklch(0.571 0.193 85.59)",
			"success": "oklch(0.521 0.161 143.8)",
			"success-foreground": "oklch(0.25 0.008 252.11)",
			"info": "oklch(0.521 0.161 263.8)",
			"info-foreground": "oklch(0.25 0.008 252.11)",
			"warning": "oklch(0.521 0.161 83.8)",
			"warning-foreground": "oklch(0.25 0.008 252.11)",
			"error": "oklch(0.589 0.199 27.84)",
			"error-foreground": "oklch(0.25 0.008 252.11)",
			"button-default": "oklch(0.98 0.003 252.11)",
			"button-default-foreground": "oklch(0.15 0.011 252.11)"
		}
	},
	"fonts": {
		"heading": { "family": "\"Sora\", \"Inter\", ui-sans-serif, system-ui, sans-serif", "source": null, "files": null },
		"body": { "family": "\"Inter\", ui-sans-serif, system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\"", "source": null, "files": null },
		"mono": { "family": "\"JetBrains Mono\", ui-monospace, \"Cascadia Code\", \"Source Code Pro\", Menlo, Consolas, \"DejaVu Sans Mono\", monospace", "source": null, "files": null }
	},
	"typeRoles": {
		"display": { "size": "3.5rem", "lineHeight": "1.1", "weight": "700", "tracking": "-0.02em" },
		"h1": { "size": "2.25rem", "lineHeight": "1.2", "weight": "600", "tracking": "-0.02em" },
		"h2": { "size": "1.875rem", "lineHeight": "1.25", "weight": "600", "tracking": "-0.01em" },
		"h3": { "size": "1.5rem", "lineHeight": "1.3", "weight": "600" },
		"title": { "size": "1.125rem", "lineHeight": "1.4", "weight": "600" },
		"body-lg": { "size": "1rem", "lineHeight": "1.5", "weight": "400" },
		"body": { "size": "0.875rem", "lineHeight": "1.5", "weight": "400" },
		"body-sm": { "size": "0.8125rem", "lineHeight": "1.5", "weight": "400" },
		"caption": { "size": "0.75rem", "lineHeight": "1.5", "weight": "400", "tracking": "0.01em" }
	},
	"radius": {
		"base": { "value": "8px", "mode": "convert" }
	},
	"radiusGroups": {
		"button": { "value": "9999px", "mode": "as-is" },
		"input": null,
		"overlay": { "shift": "4px" },
		"card": { "shift": "4px" },
		"badge": { "value": "9999px", "mode": "as-is" },
		"surface": null,
		"typography": null
	},
	"components": {
		// Buttons & Badges
		"button": { "group": "button" },
		"badge": { "group": "badge" },
		"avatar": { "group": "badge" },
		// Inputs & Forms (all mapped; form/label are form controls)
		"input": { "group": "input" },
		"label": { "group": "input" },
		"textarea": { "group": "input" },
		"select": { "group": "input" },
		"checkbox": { "group": "input" },
		"radio-group": { "group": "input" },
		"switch": { "group": "input" },
		"slider": { "group": "input" },
		"calendar": { "group": "input" },
		"input-otp": { "group": "input" },
		"form": { "group": "input" },
		"toggle": { "group": "input" },
		"toggle-group": { "group": "input" },
		// Overlays
		"dialog": { "group": "overlay", "radius": { "shift": "2px" }, "sizes": { "sm": { "width": { "value": "600px", "mode": "convert" } }, "lg": { "width": { "value": "1200px", "mode": "convert" } } } },
		"alert-dialog": { "group": "overlay" },
		"drawer": { "group": "overlay" },
		"sheet": { "group": "overlay" },
		"popover": { "group": "overlay" },
		"dropdown-menu": { "group": "overlay" },
		"context-menu": { "group": "overlay" },
		"hover-card": { "group": "overlay" },
		"tooltip": { "group": "overlay" },
		"command": { "group": "overlay" },
		"toast": { "group": "overlay" },
		// Cards
		"card": { "group": "card" },
		// Surfaces & Data (mapped: any dir shipping a css.ts)
		"table": { "group": "surface" },
		"tabs": { "group": "surface" },
		"accordion": { "group": "surface" },
		"alert": { "group": "surface" },
		"skeleton": { "group": "surface" },
		"progress": { "group": "surface" },
		"scroll-area": { "group": "surface" },
		"resizable": { "group": "surface" },
		"separator": { "group": "surface" },
		"collapsible": { "group": "surface" },
		"aspect-ratio": { "group": "surface" },
		"breadcrumb": { "group": "surface" },
		"pagination": { "group": "surface" },
		"sidebar": { "group": "surface" },
		// Typography components (each owns a css.ts)
		"heading": { "group": "typography" },
		"text": { "group": "typography" }
		// `squircle` is DELIBERATELY excluded: it ships no *.css.ts (only .tsx/.mdx/.stories),
		// so it has no token surface to codegen/codemod and is not a tokenization target (spec §9).
	},
	"spacing": {
		"card-padding": { "value": "1.5rem", "mode": "convert" },
		"control-x": { "value": "0.875rem", "mode": "convert" },
		"control-y": { "value": "0.5rem", "mode": "convert" }
	},
	"shadow": {
		"sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		"md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
		"lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)"
	},
	"breakpoints": { "sm": "40rem", "md": "48rem", "lg": "64rem", "xl": "80rem", "2xl": "96rem" },
	"animation": {
		"duration": { "fast": "150ms", "base": "200ms", "slow": "300ms" },
		"easing": { "in": "cubic-bezier(0.4, 0, 1, 1)", "out": "cubic-bezier(0, 0, 0.2, 1)", "inOut": "cubic-bezier(0.4, 0, 0.2, 1)" }
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS (2 tests). `typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add src/theme/preset.json scripts/types.ts tests/types.test.ts
git commit -m "feat(shared-ui): add preset schema and default preset.json"
```

> Task 2 adds no devDep or script, so `package.json`/`pnpm-lock.yaml` are NOT staged here (they carry unrelated pre-existing changes). `vitest.config.ts` / `test` script get packaged in Task 3.

---

## Task 3: Test harness + `tsx` runner

**Files:**
- Create: `packages/shared-ui/vitest.config.ts`
- Modify: `packages/shared-ui/package.json`

- [ ] **Step 1: Add the remaining devDependency (`tsx`)**

> `vitest ^4.1.2` was already added in Task 0 Step 2. Do NOT downgrade it to `^3.2.4` — that pin is incompatible with the pinned `vite ~8.0.3` (vitest 3 requires vite ^5/^6; vitest 4.1.2 peers with vite ^8).

In `packages/shared-ui/package.json` `devDependencies` add:

```json
		"tsx": "^4.19.2"
```

Then run: `pnpm install` (from repo root). Expected: install completes, `tsx` + `vitest` land in `node_modules`.

- [ ] **Step 2: Create vitest.config.ts**

Create `packages/shared-ui/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
```

- [ ] **Step 3: Add scripts to package.json**

In `scripts` add:

```json
		"test": "vitest run",
		"test:watch": "vitest",
		"preset:build": "tsx scripts/cli-build.ts",
		"preset:codemod": "tsx scripts/cli-codemod.ts",
		"preset:reset": "tsx scripts/cli-reset.ts",
		"preset:check": "tsx scripts/cli-check.ts"
```

(`preset` — the dashboard script — is added in the dashboard plan.)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @repo/shared-ui test` — expected: existing tests pass.
Run: `pnpm --filter @repo/shared-ui preset:build` — expected: fails cleanly ("file not found" until Task 7 creates the CLI; that's fine, verify the script resolves `tsx`).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git add -p package.json          # only the `tsx` devDep hunk
git commit -m "chore(shared-ui): add vitest harness and tsx scripts"
```

> `pnpm-lock.yaml` is not staged here (it carries unrelated pre-existing changes from `pnpm install`); the implementing user reconciles it at merge time.

---

## Task 4: Conversion engine (scales + snap + as-is)

**Files:**
- Create: `packages/shared-ui/scripts/scales.ts`
- Create: `packages/shared-ui/scripts/conversion.ts`
- Test: `packages/shared-ui/tests/conversion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/conversion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { convertValue } from "../scripts/conversion";

describe("convertValue — snap to nearest Tailwind step", () => {
	it("maps 1200px width to the nearest container step (max-w-6xl, 72rem)", () => {
		const r = convertValue("1200px", "width", "convert");
		expect(r.className).toBe("max-w-6xl");
		expect(r.display).toContain("72rem");
	});

	it("maps 600px width to max-w-xl (36rem)", () => {
		expect(convertValue("600px", "width", "convert").className).toBe("max-w-xl");
	});

	it("maps 13px radius to rounded-xl (0.75rem)", () => {
		expect(convertValue("13px", "radius", "convert").className).toBe("rounded-xl");
	});

	it("maps 40px height to h-10", () => {
		expect(convertValue("40px", "height", "convert").className).toBe("h-10");
	});

	it("maps 16px spacing-x to px-4", () => {
		expect(convertValue("16px", "spacing-x", "convert").className).toBe("px-4");
	});

	it("maps 600 font-weight to font-semibold", () => {
		expect(convertValue("600", "font-weight", "convert").className).toBe("font-semibold");
	});

	it("keeps rem values verbatim when snapping is within the scale", () => {
		expect(convertValue("0.875rem", "font-size", "convert").className).toBe("text-sm");
	});

	it("handles as-is mode by emitting a var reference, not an arbitrary class", () => {
		const r = convertValue("13px", "radius", "as-is");
		expect(r.value).toBe("13px");
		expect(r.varName).toBe("radius");
	});
});

describe("convertValue — as-is keeps literal value", () => {
	it("never snaps a pixel-perfect value", () => {
		const r = convertValue("1200px", "width", "as-is");
		expect(r.value).toBe("1200px");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — `Cannot find module '../scripts/conversion'`.

- [ ] **Step 3: Create the scale tables**

Create `scripts/scales.ts`:

```ts
export interface ScaleStep {
	key: string;
	/** canonical value in rem */
	rem: number;
	/** utility class prefix + key, e.g. "max-w-" + "6xl" */
	className: string;
}

function pxToRem(value: string): number {
	const v = value.trim();
	if (v.endsWith("rem")) return Number.parseFloat(v);
	if (v.endsWith("px")) return Number.parseFloat(v) / 16;
	return Number.parseFloat(v); // bare number = rem
}

export function nearestStep(steps: ScaleStep[], value: string): { step: ScaleStep; deltaRem: number } {
	const target = pxToRem(value);
	let best = steps[0];
	let bestDelta = Math.abs(steps[0].rem - target);
	for (const s of steps) {
		const d = Math.abs(s.rem - target);
		if (d < bestDelta) {
			best = s;
			bestDelta = d;
		}
	}
	return { step: best, deltaRem: Math.abs(best.rem - target) };
}

// Tailwind v4 default scales (rem)
export const CONTAINER_SCALE: ScaleStep[] = [
	{ key: "3xs", rem: 16, className: "max-w-3xs" },
	{ key: "2xs", rem: 18, className: "max-w-2xs" },
	{ key: "xs", rem: 20, className: "max-w-xs" },
	{ key: "sm", rem: 24, className: "max-w-sm" },
	{ key: "md", rem: 28, className: "max-w-md" },
	{ key: "lg", rem: 32, className: "max-w-lg" },
	{ key: "xl", rem: 36, className: "max-w-xl" },
	{ key: "2xl", rem: 42, className: "max-w-2xl" },
	{ key: "3xl", rem: 48, className: "max-w-3xl" },
	{ key: "4xl", rem: 56, className: "max-w-4xl" },
	{ key: "5xl", rem: 64, className: "max-w-5xl" },
	{ key: "6xl", rem: 72, className: "max-w-6xl" },
	{ key: "7xl", rem: 80, className: "max-w-7xl" },
];

export const RADIUS_SCALE: ScaleStep[] = [
	{ key: "xs", rem: 0.125, className: "rounded-xs" },
	{ key: "sm", rem: 0.25, className: "rounded-sm" },
	{ key: "md", rem: 0.375, className: "rounded-md" },
	{ key: "lg", rem: 0.5, className: "rounded-lg" },
	{ key: "xl", rem: 0.75, className: "rounded-xl" },
	{ key: "2xl", rem: 1, className: "rounded-2xl" },
	{ key: "3xl", rem: 1.5, className: "rounded-3xl" },
	{ key: "4xl", rem: 2, className: "rounded-4xl" },
	{ key: "full", rem: Number.POSITIVE_INFINITY, className: "rounded-full" },
];

export const FONT_SIZE_SCALE: ScaleStep[] = [
	{ key: "xs", rem: 0.75, className: "text-xs" },
	{ key: "sm", rem: 0.875, className: "text-sm" },
	{ key: "base", rem: 1, className: "text-base" },
	{ key: "lg", rem: 1.125, className: "text-lg" },
	{ key: "xl", rem: 1.25, className: "text-xl" },
	{ key: "2xl", rem: 1.5, className: "text-2xl" },
	{ key: "3xl", rem: 1.875, className: "text-3xl" },
	{ key: "4xl", rem: 2.25, className: "text-4xl" },
	{ key: "5xl", rem: 3, className: "text-5xl" },
	{ key: "6xl", rem: 3.75, className: "text-6xl" },
];

export const FONT_WEIGHT_SCALE: ScaleStep[] = [
	{ key: "thin", rem: 100, className: "font-thin" },
	{ key: "extralight", rem: 200, className: "font-extralight" },
	{ key: "light", rem: 300, className: "font-light" },
	{ key: "normal", rem: 400, className: "font-normal" },
	{ key: "medium", rem: 500, className: "font-medium" },
	{ key: "semibold", rem: 600, className: "font-semibold" },
	{ key: "bold", rem: 700, className: "font-bold" },
	{ key: "extrabold", rem: 800, className: "font-extrabold" },
	{ key: "black", rem: 900, className: "font-black" },
];

export const LINE_HEIGHT_SCALE: ScaleStep[] = [
	{ key: "none", rem: 1, className: "leading-none" },
	{ key: "tight", rem: 1.25, className: "leading-tight" },
	{ key: "snug", rem: 1.375, className: "leading-snug" },
	{ key: "normal", rem: 1.5, className: "leading-normal" },
	{ key: "relaxed", rem: 1.625, className: "leading-relaxed" },
	{ key: "loose", rem: 2, className: "leading-loose" },
];

export const TRACKING_SCALE: ScaleStep[] = [
	{ key: "tighter", rem: -0.05, className: "tracking-tighter" },
	{ key: "tight", rem: -0.025, className: "tracking-tight" },
	{ key: "normal", rem: 0, className: "tracking-normal" },
	{ key: "wide", rem: 0.025, className: "tracking-wide" },
	{ key: "wider", rem: 0.05, className: "tracking-wider" },
	{ key: "widest", rem: 0.1, className: "tracking-widest" },
];

export const SPACING_BASE = 0.25; // 0.25rem = 4px

export function snapSpacing(value: string): { step: number; rem: number } {
	const target = pxToRem(value);
	const step = Math.round(target / SPACING_BASE);
	const rem = step * SPACING_BASE;
	return { step, rem };
}

export function remToDisplay(rem: number): string {
	if (rem === Number.POSITIVE_INFINITY) return "9999px";
	if (rem === 0) return "0";
	const px = rem * 16;
	return px === Math.round(px) ? `${Math.round(px)}px` : `${rem}rem`;
}

export { pxToRem };
```

- [ ] **Step 4: Create the conversion engine**

Create `scripts/conversion.ts`:

```ts
import {
	CONTAINER_SCALE,
	FONT_SIZE_SCALE,
	FONT_WEIGHT_SCALE,
	LINE_HEIGHT_SCALE,
	RADIUS_SCALE,
	TRACKING_SCALE,
	nearestStep,
	pxToRem,
	remToDisplay,
	snapSpacing,
} from "./scales";

export type ValueKind =
	| "width"
	| "radius"
	| "font-size"
	| "font-weight"
	| "line-height"
	| "tracking"
	| "spacing-x"
	| "spacing-y"
	| "height";

export interface ResolvedValue {
	/** final value for the theme var (rem or literal) */
	value: string;
	/** standard utility class when snapped ("" when as-is or n/a) */
	className: string;
	/** human display, e.g. "1200px → max-w-6xl (72rem, Δ48px)" */
	display: string;
	/** var namespace for override previews */
	varName: string;
	snapped: boolean;
	delta?: string;
}

export function convertValue(raw: string, kind: ValueKind, mode: "convert" | "as-is"): ResolvedValue {
	const asIs = (value: string, className = "", varName: string): ResolvedValue => ({
		value,
		className,
		display: `${raw} (as-is)`,
		varName,
		snapped: false,
	});

	const fromStep = (step: { key: string; rem: number; className: string }, deltaRem: number, varName: string): ResolvedValue => ({
		value: remToDisplay(step.rem),
		className: step.className,
		display: `${raw} → ${step.className} (${remToDisplay(step.rem)}${deltaRem > 0 ? `, Δ${remToDisplay(deltaRem)}` : ""})`,
		varName,
		snapped: true,
		delta: deltaRem > 0 ? remToDisplay(deltaRem) : undefined,
	});

	if (mode === "as-is") {
		return asIs(raw, "", kind === "radius" ? "radius" : kind);
	}

	switch (kind) {
		case "width": {
			const { step, deltaRem } = nearestStep(CONTAINER_SCALE, raw);
			return fromStep(step, deltaRem, "container");
		}
		case "radius": {
			const { step, deltaRem } = nearestStep(RADIUS_SCALE, raw);
			return fromStep(step, deltaRem, "radius");
		}
		case "font-size": {
			const { step, deltaRem } = nearestStep(FONT_SIZE_SCALE, raw);
			return fromStep(step, deltaRem, "text");
		}
		case "font-weight": {
			const { step, deltaRem } = nearestStep(FONT_WEIGHT_SCALE, raw);
			return fromStep(step, deltaRem, "font-weight");
		}
		case "line-height": {
			const { step, deltaRem } = nearestStep(LINE_HEIGHT_SCALE, raw);
			return fromStep(step, deltaRem, "line-height");
		}
		case "tracking": {
			const { step, deltaRem } = nearestStep(TRACKING_SCALE, raw);
			return fromStep(step, deltaRem, "tracking");
		}
		case "height":
		case "spacing-x":
		case "spacing-y": {
			const target = pxToRem(raw);
			const { step, rem } = snapSpacing(raw);
			const cls = `${kind === "height" ? "h" : kind === "spacing-x" ? "px" : "py"}-${step}`;
			return {
				value: remToDisplay(rem),
				className: cls,
				display: `${raw} → ${cls} (${remToDisplay(rem)})`,
				varName: "spacing",
				snapped: true,
				delta: Math.abs(target - rem) > 0 ? remToDisplay(Math.abs(target - rem)) : undefined,
			};
		}
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS (9 tests) — 8 snap cases + 1 as-is case.

- [ ] **Step 6: Commit**

```bash
git add scripts/scales.ts scripts/conversion.ts tests/conversion.test.ts
git commit -m "feat(shared-ui): add preset conversion engine"
```

---

## Task 5: Codegen — regenerate `colors.css` + `global.css`

**Files:**
- Create: `packages/shared-ui/scripts/codegen.ts`
- Test: `packages/shared-ui/tests/codegen.test.ts`

- [ ] **Step 1: Create the golden fixtures (copies of the current files the codegen must preserve — see spec §6)**

```bash
cp src/styles/colors.css tests/fixtures/colors.css.golden
cp src/styles/global.css tests/fixtures/global.css.golden
```

The `colors.css.golden` drives a **structure snapshot** (dark block nested inside `:root`, compared token-by-token after stripping comments/whitespace — NOT byte-equal, because codegen legitimately omits section comments and adds `--button-default*` tokens); the `global.css.golden` drives a **token-superset guard** (no existing `--token` may be dropped). Both are committed so the guards keep working after the pipeline regenerates the live files.

> **When the palette or theme intentionally changes** (new color key, radius tier, animation, …): re-run the capture above (`cp src/styles/colors.css tests/fixtures/colors.css.golden` and the same for `global.css`) to regenerate the fixtures, then `git diff tests/fixtures/` and eyeball that only the intended tokens changed. The guards assert the CURRENT files' tokens remain a subset of the output — re-capture is how a deliberate addition is blessed.

- [ ] **Step 2: Write the failing test**

Create `tests/codegen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateColorsCss, generateGlobalCss } from "../scripts/codegen";
import { buildResolvedSpec } from "../scripts/component-map";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";

const preset = presetSchema.parse(
	JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
);
const currentColors = readFileSync(resolve(__dirname, "fixtures/colors.css.golden"), "utf8");
const currentGlobal = readFileSync(resolve(__dirname, "fixtures/global.css.golden"), "utf8");

const themeTokens = (css: string): Set<string> => {
	const re = /(--[a-zA-Z0-9-]+):/g;
	const out = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = re.exec(css))) out.add(m[1]);
	return out;
};

describe("codegen", () => {
	it("colors.css emits every light color var", () => {
		const css = generateColorsCss(preset);
		for (const key of Object.keys(preset.colors.light)) {
			expect(css).toContain(`--${key}: ${preset.colors.light[key]}`);
		}
	});

	it("colors.css dark block is NESTED inside :root — structure matches the golden", () => {
		// Defect-4 regression guard: a bare sibling `&:where([data-theme=...])` inside
		// `@layer utilities` (outside :root) is a dead selector. Snapshoting the WHOLE
		// file byte-for-byte never passes though: `generateColorsCss` omits the golden's
		// `/* Sidebar/Chart/Status colors */` section comments and ADDS preset-owned
		// `--button-default`/`--button-default-foreground` tokens the real file lacks — so
		// a byte-equal `.toBe(currentColors)` is impossible. Compare STRUCTURALLY instead:
		// strip comments + normalize whitespace, then assert the golden's token:value set
		// is a SUBSET of the generated output (nothing dropped, order/padding decoupled).
		const normalize = (css: string) =>
			css
				.replace(/\/\*[\s\S]*?\*\//g, "") // drop `/* … */` section comments
				.replace(/[ \t]+/g, " ") // collapse horizontal whitespace
				.trim();
		const goldenTokens = normalize(currentColors).match(/--[a-z0-9-]+:[^;]+/g) ?? [];
		const generated = normalize(generateColorsCss(preset));
		for (const token of goldenTokens) {
			expect(generated).toContain(token);
		}
		// explicit non-regression: every dark var must appear AFTER :root opens, inside it
		const css = generateColorsCss(preset);
		const inner = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
		expect(inner).toContain('[data-theme="dark"]');
	});

	it("global.css is a SUPERSET of the current @theme token set — nothing dropped", () => {
		const generated = generateGlobalCss(preset, buildResolvedSpec(preset));
		for (const token of themeTokens(currentGlobal)) {
			expect(generated).toContain(`${token}:`);
		}
		// explicit high-value tokens that rounded-md / the base layer rely on (defect 3)
		for (const token of ["--radius", "--radius-sm", "--radius-md", "--radius-lg", "--font-sans", "--color-black", "--spacing", "--sidebar-width", "--animate-accordion-down"]) {
			expect(generated).toContain(token);
		}
	});

	it("per-mode parity: convert saves the SNAPPED value, as-is saves the LITERAL", () => {
		// defect 1: codegen MUST apply convertValue per-mode, or convert/as-is are byte-identical
		const convertPreset = { ...preset, radius: { base: { value: "13px", mode: "convert" } } };
		const convert = generateGlobalCss(convertPreset, buildResolvedSpec(convertPreset));
		expect(convert).not.toContain("--radius: 13px");
		expect(convert).toMatch(/--radius: 0\.75rem/);

		const asIsPreset = { ...preset, radius: { base: { value: "13px", mode: "as-is" } } };
		const asIs = generateGlobalCss(asIsPreset, buildResolvedSpec(asIsPreset));
		expect(asIs).toContain("--radius: 13px");
		expect(asIs).not.toMatch(/--radius: 0\./);
	});

	it("emits a per-component radius token when a component opts out of its group", () => {
		const presetWithDialog = structuredClone(preset);
		(presetWithDialog.components.dialog as Record<string, unknown>).radius = { value: "2px", mode: "convert" };
		const css = generateGlobalCss(presetWithDialog, buildResolvedSpec(presetWithDialog));
		expect(css).toContain("--radius-dialog");
	});

	it("global.css emits a font @import when a face has a hosted source", () => {
		const hosted = structuredClone(preset);
		hosted.fonts.body.source = "https://fonts.googleapis.com/css2?family=Inter";
		const css = generateGlobalCss(hosted, buildResolvedSpec(hosted));
		expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter");');
		expect(css).toContain("--font-body");
	});

	it("global.css emits @font-face when a face has self-hosted files", () => {
		const selfHosted = structuredClone(preset);
		selfHosted.fonts.body.files = ["fonts/inter-latin.woff2"];
		const css = generateGlobalCss(selfHosted, buildResolvedSpec(selfHosted));
		expect(css).toContain("@font-face");
		expect(css).toContain('url("fonts/inter-latin.woff2")');
	});

	it("global.css contains semantic radius vars from groups, none from inheriting typography", () => {
		const css = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(css).toContain("--radius-button");
		expect(css).toContain("--radius-overlay");
		expect(css).not.toContain("--radius-typography:");
		expect(css).not.toContain("--radius-heading:");
	});

	it("global.css contains type role text vars with line-height", () => {
		const css = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(css).toContain("--text-body");
		expect(css).toContain("--text-body--line-height");
	});

	it("is idempotent — generating twice yields identical output", () => {
		const a = generateGlobalCss(preset, buildResolvedSpec(preset));
		const b = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(a).toBe(b);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create the component map + resolved spec (three-tier: component > group > base)**

Create `scripts/component-map.ts`:

```ts
import type { Preset, TokenValue, RadiusOverride } from "./types";
import { convertValue } from "./conversion";

/**
 * Component name → group. Matches the default preset.json `components` map.
 * All 44 css.ts-bearing components are listed (verified: carousel, chart, spinner,
 * squircle ship no css.ts and are intentionally absent — they are not tokenization targets).
 * heading/text are typography components; form/label are form controls.
 */
export const DEFAULT_GROUP_ASSIGNMENT: Record<string, string> = {
	button: "button",
	input: "input",
	label: "input",
	textarea: "input",
	select: "input",
	checkbox: "input",
	"radio-group": "input",
	switch: "input",
	slider: "input",
	calendar: "input",
	"input-otp": "input",
	form: "input",
	toggle: "input",
	"toggle-group": "input",
	dialog: "overlay",
	"alert-dialog": "overlay",
	drawer: "overlay",
	sheet: "overlay",
	popover: "overlay",
	"dropdown-menu": "overlay",
	"context-menu": "overlay",
	"hover-card": "overlay",
	tooltip: "overlay",
	command: "overlay",
	toast: "overlay",
	card: "card",
	badge: "badge",
	avatar: "badge",
	table: "surface",
	tabs: "surface",
	accordion: "surface",
	alert: "surface",
	skeleton: "surface",
	progress: "surface",
	"scroll-area": "surface",
	resizable: "surface",
	separator: "surface",
	collapsible: "surface",
	"aspect-ratio": "surface",
	breadcrumb: "surface",
	pagination: "surface",
	sidebar: "surface",
	heading: "typography",
	text: "typography",
};

/**
 * Three-tier radius resolver.
 * Returns the effective resolved radius for a COMPONENT:
 *   component `components.<name>.radius`  → wins (component > group)
 *   else group `radiusGroups.<group>`     → wins (group > base)
 *   else INHERIT (the GENERAL base)
 * Each non-inherit resolution carries the token suffix it should emit: `group`
 * for group opt-outs, `components.<name>` for component opt-outs.
 */
export type RadiusResolution =
	| { kind: "inherit" }
	| { kind: "value"; value: TokenValue; token: string }
	| { kind: "shift"; shift: string; token: string };

function resolveOverride(
	override: RadiusOverride,
): { kind: "inherit" } |
	Omit<Extract<RadiusResolution, { kind: "value" }>, "token"> |
	Omit<Extract<RadiusResolution, { kind: "shift" }>, "token"> {
	if (!override) return { kind: "inherit" };
	if ("shift" in override) return { kind: "shift", shift: override.shift };
	return { kind: "value", value: override };
}

export function resolveGroupRadius(
	preset: Preset,
	group: string,
): RadiusResolution {
	const r = resolveOverride(preset.radiusGroups[group]);
	return r.kind === "inherit" ? r : { ...r, token: group };
}

export function resolveComponentRadius(
	preset: Preset,
	name: string,
	group: string,
): RadiusResolution {
	const entry = preset.components[name] as (Preset["components"][string] & { radius?: RadiusOverride }) | undefined;
	if (entry?.radius !== undefined) {
		// component-level override wins — token suffix is the component name
		const r = resolveOverride(entry.radius);
		return r.kind === "inherit" ? r : { ...r, token: name };
	}
	return resolveGroupRadius(preset, group);
}

export type ComponentRadius = {
	group: string;
	radius?: RadiusOverride;
	sizes?: Record<string, { width?: TokenValue }>;
};

/** Resolved per-component spec after three-tier inheritance + conversion. */
export interface ResolvedComponentSpec {
	name: string;
	group: string;
	radius: RadiusResolution;
	/** base radius resolved to its Tailwind class (used for inherit-ers) */
	baseClassName: string;
	sizes: Array<{ key: string; widthVar: string; widthValue: string; widthMode: "convert" | "as-is" }>;
}

export function buildResolvedSpec(preset: Preset): ResolvedComponentSpec[] {
	// base radius → its snapped class / value, reused by every inheriting component
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	return Object.entries(preset.components).map(([name, entryRaw]) => {
		const entry = entryRaw as unknown as ComponentRadius;
		const group = entry.group;
		const radius = resolveComponentRadius(preset, name, group);
		// per-component sizes only (group `sizes` is not a schema field); widths resolved
		// THROUGH convertValue per-mode so the codegen + dashboard preview agree by construction
		const sizes = Object.entries(entry.sizes ?? {}).map(([key, s]) => {
			const w = s.width ?? { value: "600px", mode: "convert" as const };
			const resolved = convertValue(w.value, "width", w.mode);
			return {
				key,
				widthVar: `--container-${name}-${key}`,
				widthValue: resolved.value,
				widthMode: w.mode,
			};
		});
		return { name, group, radius, baseClassName: base.className, sizes };
	});
}
```

- [ ] **Step 4: Create the codegen**

Create `scripts/codegen.ts`:

```ts
import type { Preset } from "./types";
import type { ResolvedComponentSpec } from "./component-map";
import { convertValue } from "./conversion"; // used per-mode for the base + semantic radii below

export function generateColorsCss(preset: Preset): string {
	const varLine = (set: Record<string, string>, indent: string) =>
		Object.entries(set).map(([k, v]) => `${indent}--${k}: ${v};`).join("\n");

	// Defect-4 fix: the dark block is NESTED inside :root (exactly like the real file),
	// NOT a sibling under @layer utilities — a bare `&` with no parent rule is dead CSS.
	return `@layer utilities {
\t:root {
${varLine(preset.colors.light, "\t\t")}

\t\t&:where([data-theme="dark"], [data-theme="dark"] *) {
${varLine(preset.colors.dark, "\t\t\t")}
\t\t}
\t}
}
`;
}

export function generateGlobalCss(preset: Preset, specs: ResolvedComponentSpec[]): string {
	const colorMapping = Object.keys(preset.colors.light)
		.map((k) => `\t--color-${k}: var(--${k});`)
		.join("\n");

	// SUPERSET (defect-3): preserve the semantic/literal color aliases the current
	// global.css emits but the preset's `--color-${k}` mapping cannot derive —
	//   - `--color-black` is a LITERAL in the real file (#0b0c0e); no `black` preset key (colors.css has no `--black`).
	//   - `--color-sidebar` aliases `var(--sidebar-background)` (the mapping emits the
	//     fully-qualified `--color-sidebar-background`, which is fine as an EXTRA, but the
	//     bare `--color-sidebar` token must not be dropped or `bg-sidebar` breaks).
	// Both must be emitted or the token-superset guard (and `bg-black`/`bg-sidebar`) silently
	// lose their live values.
	const preservedColors = [
		"\t--color-black: #0b0c0e;",
		"\t--color-sidebar: var(--sidebar-background);",
	].join("\n");

	const typeRoles = Object.entries(preset.typeRoles)
		.map(
			([role, r]) =>
				`\t--text-${role}: ${r.size};\n\t--text-${role}--line-height: ${r.lineHeight};`,
		)
		.join("\n");

	// Defect-1 fix: the base radius goes through convertValue per-mode —
	// convert → snapped value (WYSIWYG), as-is → literal.
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	const radiusScale = [
		`\t--radius: ${base.value};`,
		`\t--radius-base: ${base.value};`,
		// SUPERSET (defect-3): preserve the --radius-sm/md/lg tier so `rounded-md` etc.
		// keep tracking --radius instead of falling back to fixed 0.375rem.
		`\t--radius-lg: var(--radius);`,
		`\t--radius-md: calc(var(--radius) - 2px);`,
		`\t--radius-sm: calc(var(--radius) - 4px);`,
	].join("\n");

	// Three-tier semantic radii: emit a token for EVERY group/component that opts out
	// (group token, or component token when the component overrides its group). Values
	// go through convertValue per-mode so codegen == dashboard preview.
	// Dedup by token: many components share a group (e.g. every `input`), so only the
	// first spec carrying a given token emits the var line.
	const emitted = new Set<string>();
	const semanticRadii = specs
		.sort((a, b) => (a.radius.kind === "inherit" ? 1 : 0) - (b.radius.kind === "inherit" ? 1 : 0)) // group tokens before inheriters, for deterministic ordering
		.map((s) => {
			if (s.radius.kind === "value") {
				const rv = convertValue(s.radius.value.value, "radius", s.radius.value.mode);
				const line = `\t--radius-${s.radius.token}: ${rv.value};`;
				return emitted.has(s.radius.token) ? null : (emitted.add(s.radius.token), line);
			}
			if (s.radius.kind === "shift") {
				const line = `\t--radius-${s.radius.token}: calc(var(--radius) + ${s.radius.shift});`;
				return emitted.has(s.radius.token) ? null : (emitted.add(s.radius.token), line);
			}
			return null; // inherits base — no token emitted
		})
		.filter((line): line is string => line !== null)
		.join("\n");

	const containers = specs
		.flatMap((s) => s.sizes.map((sz) => `\t--container-${s.name}-${sz.key}: ${sz.widthValue};`))
		.join("\n");

	const shadows = Object.entries(preset.shadow)
		.map(([k, v]) => `\t--shadow-${k}: ${v};`)
		.join("\n");

	const breakpoints = Object.entries(preset.breakpoints)
		.map(([k, v]) => `\t--breakpoint-${k}: ${v};`)
		.join("\n");

	const faces = {
		heading: preset.fonts.heading,
		body: preset.fonts.body,
		mono: preset.fonts.mono,
	};
	// `--font-sans` is the ALIAS Tailwind's `font-sans` utility resolves. The preset
	// only has heading/body/mono; the real global.css maps `--font-sans` to the body
	// family, so emit it (pointing at the body face) or `font-sans` silently breaks.
	const fonts = [
		`\t--font-heading: ${preset.fonts.heading.family};`,
		`\t--font-body: ${preset.fonts.body.family};`,
		`\t--font-sans: ${preset.fonts.body.family};`,
		`\t--font-mono: ${preset.fonts.mono.family};`,
	].join("\n");

	// Hosted font URL(s) → @import at top; self-hosted woff2 → @font-face blocks.
	const imports = [...new Set(Object.values(faces).map((f) => f.source).filter((s): s is string => !!s))]
		.map((url) => `@import url("${url}");`)
		.join("\n");
	const fontFaces = Object.values(faces)
		.filter((f) => f.files && f.files.length > 0)
		.map((f) =>
			f.files!.map(
				(file) =>
					`@font-face {\n\tfont-family: "${f.family.split(",")[0].trim().replace(/^"|"$/g, "")}";\n\tsrc: url("${file}") format("woff2");\n\tfont-display: swap;\n}`,
			).join("\n"),
		)
		.join("\n");

	const durations = Object.entries(preset.animation.duration)
		.map(([k, v]) => `\t--duration-${k}: ${v};`)
		.join("\n");
	const easings = Object.entries(preset.animation.easing)
		.map(([k, v]) => `\t--ease-${k}: ${v};`)
		.join("\n");

	// static wrapper preserved from the current global.css
	const importsBlock = imports ? `${imports}\n\n` : "";
	const fontFacesBlock = fontFaces ? `\n${fontFaces}\n` : "";
	return `${importsBlock}@import "tailwindcss";

@theme {
${colorMapping}
${preservedColors}

\t/* Typography */
${typeRoles}

\t/* Border Radius */
${radiusScale}
${semanticRadii}

\t/* Component Widths */
${containers}

\t/* Shadows */
${shadows}

\t/* Breakpoints */
${breakpoints}

\t/* Fonts */
${fonts}

\t/* Spacing base */
\t--spacing: 0.25rem;
${durations}
${easings}

\t/* Sidebar Width */
\t--sidebar-width: 16rem;
\t--sidebar-width-mobile: 18rem;
\t--sidebar-width-icon: 3rem;

\t/* Animation */
\t--animate-accordion-down: accordion-down 0.2s ease-out;
\t--animate-accordion-up: accordion-up 0.2s ease-out;

\t@keyframes accordion-down {
\t\tfrom { height: 0; }
\t\tto { height: var(--radix-accordion-content-height); }
\t}

\t@keyframes accordion-up {
\t\tfrom { height: var(--radix-accordion-content-height); }
\t\tto { height: 0; }
\t}
}

@layer base {
\t* {
\t\t@apply border-border;
\t}
\thtml,
\tbody {
\t\t@apply antialiased min-h-screen scroll-smooth;
\t}
\tbody {
\t\t@apply bg-background text-foreground font-sans;
\t}
}

/* Debug element */
@utility debug {
\tborder-width: 1px;
\tborder-style: dashed;
\tborder-color: #f87171;
}
${fontFacesBlock}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS.

- [ ] **Step 6: Manually inspect output**

Run: `node -e "import('./scripts/codegen.ts').then(async m => { const {presetSchema}=await import('./scripts/types'); const {readFileSync}=await import('node:fs'); const p=presetSchema.parse(JSON.parse(readFileSync('./src/theme/preset.json','utf8'))); const {buildResolvedSpec}=await import('./scripts/component-map'); console.log(m.generateGlobalCss(p, buildResolvedSpec(p)).slice(0, 1200)); })"` — hmm, native strip-types won't resolve this via node -e with tsx. Instead:

Run: `pnpm dlx tsx -e "import { readFileSync } from 'node:fs'; import { presetSchema } from './scripts/types'; import { generateGlobalCss } from './scripts/codegen'; import { buildResolvedSpec } from './scripts/component-map'; const p = presetSchema.parse(JSON.parse(readFileSync('./src/theme/preset.json','utf8'))); console.log(generateGlobalCss(p, buildResolvedSpec(p)).slice(0, 900));"`
Expected: prints the `@theme` block with `--radius-lg: var(--radius); --radius-button`, `--text-body`, `--container-dialog-sm` etc. (radius group/component opts-out surfaced as tokens; inherit-ers like `heading` emit nothing.)

- [ ] **Step 7: Commit**

```bash
git add scripts/component-map.ts scripts/codegen.ts tests/codegen.test.ts
git commit -m "feat(shared-ui): add preset theme codegen"
```

---

## Task 6: Codemod — tokenize all `*.css.ts` files

**Files:**
- Create: `packages/shared-ui/scripts/codemod.ts`
- Test: `packages/shared-ui/tests/codemod.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/codemod.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { transformCssTs } from "../scripts/codemod";

const SOURCE = `import { tv, type VariantProps } from "tailwind-variants/lite";

export const buttonStyles = tv({
	base: "inline-flex rounded-md text-sm shadow-sm bg-gray-900 text-white",
	variants: {
		size: { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", icon: "size-9" },
	},
	defaultVariants: { size: "default" },
});`;

describe("transformCssTs", () => {
	it("tokenizes radius (group opt-out), text and color classes", () => {
		const out = transformCssTs(SOURCE, "button", "button"); // button opts out → rounded-button
		expect(out.code).toContain("rounded-button");
		expect(out.code).toContain("text-body");
		expect(out.code).not.toContain("rounded-md");
		expect(out.code).toContain("bg-button-default text-button-default-foreground");
		expect(out.code).toContain("shadow-sm");
	});

	it("tokenizes an inheriting component to the plain rounded", () => {
		const out = transformCssTs(SOURCE, "table", "inherit"); // surface inherits → rounded
		expect(out.code).toContain("rounded");
		expect(out.code).toContain("text-body");
		expect(out.code).not.toContain("rounded-md");
	});

	it("emits a per-component radius token when the component overrides its group", () => {
		// three-tier: component > group > base — an override on dialog wins over the overlay group
		const out = transformCssTs(SOURCE, "dialog", "dialog");
		expect(out.code).toContain("rounded-dialog");
		expect(out.code).not.toContain("rounded-overlay");
	});

	it("is idempotent", () => {
		const once = transformCssTs(SOURCE, "button", "button");
		const twice = transformCssTs(once.code, "button", "button");
		expect(twice.code).toBe(once.code);
	});

	it("adds a size variant when the spec demands it", () => {
		const dialogSource = `import { tv } from "tailwind-variants/lite";
export const dialogStyles = tv({
	slots: {
		content: "fixed w-full max-w-lg rounded-lg p-6",
	},
});`;
		const out = transformCssTs(dialogSource, "dialog", "dialog", ["sm", "lg"]);
		expect(out.code).toContain("size: {");
		expect(out.code).toContain('sm: "max-w-dialog-sm"');
		expect(out.code).toContain('lg: "max-w-dialog-lg"');
	});

	it("reports every substitution", () => {
		const out = transformCssTs(SOURCE, "button", "button");
		expect(out.report.length).toBeGreaterThan(0);
		expect(out.report[0]).toHaveProperty("from");
		expect(out.report[0]).toHaveProperty("to");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the codemod transformer**

Create `scripts/codemod.ts`:

```ts
import ts from "typescript";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveComponentRadius } from "./component-map";

export interface Substitution {
	from: string;
	to: string;
}

export interface TransformResult {
	code: string;
	report: Substitution[];
	changed: boolean;
}

/**
 * Class substitution rules. Order matters: longest prefixes first.
 * Corner radius → `rounded` (inherit base) for inheriting components, or
 * `rounded-<token>` where `<token>` is the group OR the component name when that
 * component overrides its group (see resolveComponentRadius in component-map.ts).
 */
export function buildRules(radiusToken: "inherit" | string): Array<{ match: RegExp; to: (m: string) => string }> {
	const radiusClass = radiusToken === "inherit" ? "rounded" : `rounded-${radiusToken}`;
	return [
		// corner radius → semantic token (base or per-group opt-out)
		{ match: /\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/g, to: () => radiusClass },
		// body text sizes → role tokens
		{ match: /\btext-sm\b/g, to: () => "text-body" },
		{ match: /\btext-xs\b/g, to: () => "text-caption" },
		{ match: /\btext-base\b/g, to: () => "text-body-lg" },
		{ match: /\btext-lg\b/g, to: () => "text-title" },
		// hardcoded button colors → semantic color tokens
		{ match: /\bbg-gray-900\b/g, to: () => "bg-button-default" },
		{ match: /\btext-white\b/g, to: (m) => (m === "text-white" ? "text-button-default-foreground" : m) },
	];
}

/** Scan a class string for tokens that should be tokenized but aren't (the guard). */
export function untokenizedClasses(classString: string): string[] {
	const found = new Set<string>();
	const patterns = [
		/\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b/,
		/\btext-(xs|sm|base|lg)\b/,
		/\bbg-gray-[0-9]+\b/,
	];
	for (const p of patterns) {
		const m = classString.match(p);
		if (m) found.add(m[0]);
	}
	return [...found];
}

function transformClassString(input: string, rules: ReturnType<typeof buildRules>): { out: string; report: Substitution[] } {
	const report: Substitution[] = [];
	let out = input;
	for (const rule of rules) {
		out = out.replace(rule.match, (matched) => {
			const to = rule.to(matched);
			if (to !== matched) report.push({ from: matched, to });
			return to;
		});
	}
	return { out, report };
}

/** Insert a `size` variant into the `variants` object of the tv() config. */
function addSizeVariant(source: ts.SourceFile, sizes: string[], widthPrefix: string): ts.SourceFile {
	const tvCall = findTvCall(source);
	if (!tvCall) return source;
	const arg = tvCall.arguments[0];
	if (!arg || !ts.isObjectLiteralExpression(arg)) return source;
	const variantsProp = arg.properties.find(
		(p): p is ts.PropertyAssignment =>
			ts.isPropertyAssignment(p) && p.name.getText(source) === "variants",
	);
	const sizeObject = ts.factory.createObjectLiteralExpression(
		sizes.map((key) =>
			ts.factory.createPropertyAssignment(
				key,
				ts.factory.createStringLiteral(`${widthPrefix}${key}`),
			),
		),
		true,
	);
	const variantProp = ts.factory.createPropertyAssignment("size", sizeObject);
	let newVariants: ts.ObjectLiteralExpression;
	if (variantsProp && ts.isObjectLiteralExpression(variantsProp.initializer)) {
		newVariants = ts.factory.updateObjectLiteralExpression(variantsProp.initializer, [
			...variantsProp.initializer.properties,
			variantProp,
		]);
	} else {
		newVariants = ts.factory.createObjectLiteralExpression([variantProp], true);
	}
	const newArg = ts.factory.updateObjectLiteralExpression(arg, [
		...arg.properties.filter((p) => !(ts.isPropertyAssignment(p) && p.name.getText(source) === "variants")),
		ts.factory.createPropertyAssignment("variants", newVariants),
	]);
	const newCall = ts.factory.updateCallExpression(
		tvCall,
		tvCall.expression,
		tvCall.typeArguments,
		[newArg, ...tvCall.arguments.slice(1)],
	);
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const updated = ts.visitEachChild(
		source,
		(node) => (node === tvCall ? newCall : undefined),
		ts.factory,
	);
	return updated as ts.SourceFile;
}

function findTvCall(source: ts.SourceFile): ts.CallExpression | undefined {
	let found: ts.CallExpression | undefined;
	function visit(node: ts.Node) {
		if (ts.isCallExpression(node) && node.expression.getText(source) === "tv") {
			found = node;
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
	return found;
}

export function transformCssTs(
	sourceText: string,
	componentName: string,
	radiusToken: "inherit" | string,
	sizes: string[] = [],
	widthPrefix: string = `max-w-${componentName}-`,
): TransformResult {
	const rules = buildRules(radiusToken);
	let source = ts.createSourceFile("x.css.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

	const report: Substitution[] = [];
	let changed = false;

	const newText = source.text.replace(/("([^"\\]|\\.)*")/g, (whole, quote: string) => {
		// only rewrite string literals that look like Tailwind class lists
		if (!/(rounded-|text-(xs|sm|base|lg)\b|bg-gray-|shadow-)/.test(quote)) return whole;
		const { out, report: r } = transformClassString(quote, rules);
		if (out !== quote) {
			changed = true;
			report.push(...r);
		}
		return out;
	});

	if (sizes.length > 0) {
		source = ts.createSourceFile("x.css.ts", newText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const withSize = addSizeVariant(source, sizes, widthPrefix);
		const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
		const finalCode = printer.printFile(withSize);
		return { code: finalCode, report, changed: changed || withSize !== source };
	}

	return { code: newText, report, changed };
}

export interface CodemodOptions {
	componentsDir: string;
	preset: import("./types").Preset;
}

export function runCodemod(opts: CodemodOptions): {
	changedFiles: string[];
	untokenizedFiles: string[];
	report: Array<{ file: string; from: string; to: string }>;
} {
	const { componentsDir, preset } = opts;
	const changedFiles: string[] = [];
	const untokenizedFiles: string[] = [];
	const report: Array<{ file: string; from: string; to: string }> = [];

	const specs = new Map(
		Object.entries(preset.components).map(([name, e]) => [name, e.group] as const),
	);

	// Per-component width prefix helper: `<component>-<size>` (dialog → max-w-dialog-sm),
	// matching the `--container-<component>-<size>` tokens the codegen emits.
	const widthPrefix = (name: string, key: string) => `max-w-${name}-${key}`;

	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const file = join(dir.parentPath, dir.name, `${dir.name}.css.ts`);
		if (file.endsWith(".css.ts") === false) continue;
		const cssFile = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
		if (!existsSync(cssFile)) continue;
		const sourceText = readFileSync(cssFile, "utf8");
		const group = specs.get(dir.name);
		if (!group) {
			// new/unadopted component — scan for untokenized classes
			const found = untokenizedClasses(sourceText);
			if (found.length > 0) {
				untokenizedFiles.push(dir.name);
				report.push({ file: dir.name, from: found.join(","), to: "(UNADOPTED)" });
			}
			continue;
		}
		const sizes = Object.keys(
			(preset.components[dir.name] as { sizes?: Record<string, unknown> } | undefined)?.sizes ?? {},
		);
		// three-tier radius: component override (→ rounded-<name>), else group opt-out
		// (→ rounded-<group>), else inherit (→ rounded). The token comes from the
		// resolution, NOT the group name, so component-level overrides win.
		const resolved = resolveComponentRadius(preset, dir.name, group);
		const radiusToken = resolved.kind === "inherit" ? "inherit" : resolved.token;
		const result = transformCssTs(sourceText, dir.name, radiusToken, sizes, widthPrefix(dir.name, ""));
		if (result.changed) {
			writeFileSync(cssFile, result.code);
			changedFiles.push(dir.name);
			for (const s of result.report) report.push({ file: dir.name, from: s.from, to: s.to });
		}
		const remaining = untokenizedClasses(result.code);
		if (remaining.length > 0) {
			untokenizedFiles.push(`${dir.name} (residual: ${remaining.join(", ")})`);
		}
	}

	return { changedFiles, untokenizedFiles, report };
}

function existsSync(p: string): boolean {
	try {
		readFileSync(p);
		return true;
	} catch {
		return false;
	}
}
```

> Note: `widthPrefix` defaults to `max-w-<component>-` so the width utilities stay in the component's namespace (`max-w-dialog-sm`) and always match the `--container-<component>-<size>` tokens the codegen emits — no name-based heuristic inside the transformer.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS.

- [ ] **Step 5: Dry-run the codemod against a real component and review the diff**

Run: `pnpm dlx tsx -e "import { runCodemod } from './scripts/codemod'; import { readFileSync } from 'node:fs'; import { presetSchema } from './scripts/types'; const p = presetSchema.parse(JSON.parse(readFileSync('./src/theme/preset.json','utf8'))); console.log(JSON.stringify(runCodemod({ componentsDir: './src/components', preset: p }), null, 2));"`

> This WRITES files. To keep it reviewable, commit nothing yet — inspect `git status`/`git diff` per file, verify each substitution is correct (especially radius — three-tier: a component with its own override → `rounded-<component>` (e.g. `dialog` → `rounded-dialog`); else an opt-out group → `rounded-<group>` (e.g. button/badge → `rounded-button`/`rounded-badge`, overlay/card shift → `rounded-overlay`/`rounded-card`); else inherits → `rounded`; text: `text-sm` → `text-body`; widths: `max-w-lg` → `max-w-dialog-lg` on sized components). Fix any wrong mapping by adjusting `buildRules`/`radiusGroups` (e.g. if a specific component must keep `rounded-lg`, give it a per-component radius entry) and re-run.
>
> Expected residual report (acceptable, not tokenized by design): `motion-*`, `data-[state=...]`, `focus-visible:ring-*`, `ring-*`, `border`, `rounded-full` (kept), `rounded-xs` on dialog close button (kept).

- [ ] **Step 6: Commit**

```bash
git add scripts/codemod.ts tests/codemod.test.ts src/components
git commit -m "refactor(shared-ui): tokenize all component css to semantic preset tokens"
```

---

## Task 7: Pipeline + CLI entries (`preset:build`, `preset:codemod`, `preset:reset`)

**Files:**
- Create: `packages/shared-ui/scripts/pipeline.ts`
- Create: `packages/shared-ui/scripts/cli-build.ts`
- Create: `packages/shared-ui/scripts/cli-codemod.ts`
- Create: `packages/shared-ui/scripts/cli-reset.ts`
- Create: `packages/shared-ui/scripts/cli-check.ts`

- [ ] **Step 1: Create the pipeline**

Create `scripts/pipeline.ts`:

```ts
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { presetSchema, type Preset } from "./types";
import { buildResolvedSpec, type ResolvedComponentSpec } from "./component-map";
import { generateColorsCss, generateGlobalCss } from "./codegen";
import { runCodemod } from "./codemod";

export interface PipelineResult {
	colorsCss: string;
	globalCss: string;
	specs: ResolvedComponentSpec[];
	changedComponents: string[];
	untokenized: string[];
}

export const PRESET_PATH = resolve("src/theme/preset.json");
export const COLORS_PATH = resolve("src/styles/colors.css");
export const GLOBAL_CSS_PATH = resolve("src/styles/global.css");
export const BACKUP_DIR = resolve("src/theme/.backup");

export function loadPreset(): Preset {
	return presetSchema.parse(JSON.parse(readFileSync(PRESET_PATH, "utf8")));
}

/**
 * Snapshot EVERY file the pipeline may write — the theme files PLUS every component
 * `*.css.ts` — before ANY write.*. Defect-10 fix: without this, a bad codemod or an
 * interrupt mid-write could not be rolled back; the backup must exist first.
 */
export function snapshotBackup(): string[] {
	mkdirSync(BACKUP_DIR, { recursive: true });
	const copied: string[] = [];
	const themeFiles: ReadonlyArray<readonly [string, string]> = [
		[PRESET_PATH, "preset.json"],
		[COLORS_PATH, "colors.css"],
		[GLOBAL_CSS_PATH, "global.css"],
	];
	for (const [src, name] of themeFiles) {
		if (existsSync(src)) {
			copyFileSync(src, join(BACKUP_DIR, name));
			copied.push(name);
		}
	}
	// every component css.ts, mirrored under .backup/components/<dir>/<dir>.css.ts
	const componentsDir = resolve("src/components");
	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const src = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
		if (!existsSync(src)) continue; // e.g. carousel/chart/spinner/squircle have no css.ts
		const rel = join("components", dir.name, `${dir.name}.css.ts`);
		const dest = join(BACKUP_DIR, rel);
		mkdirSync(dirname(dest), { recursive: true });
		copyFileSync(src, dest);
		copied.push(rel);
	}
	return copied;
}

/** Restore the backup (rollback on failure). Returns the list of restored files. */
export function restoreBackup(): string[] {
	const restored: string[] = [];
	for (const src of [PRESET_PATH, COLORS_PATH, GLOBAL_CSS_PATH]) {
		const name = basename(src);
		if (!existsSync(join(BACKUP_DIR, name))) continue;
		writeFileSync(src, readFileSync(join(BACKUP_DIR, name)));
		restored.push(name);
	}
	const componentsDir = resolve("src/components");
	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const rel = join("components", dir.name, `${dir.name}.css.ts`);
		const backup = join(BACKUP_DIR, rel);
		if (!existsSync(backup)) continue;
		writeFileSync(resolve(componentsDir, rel), readFileSync(backup));
		restored.push(rel);
	}
	return restored;
}

export function runPipeline(preset: Preset, { applyComponents }: { applyComponents: boolean }): PipelineResult {
	const specs = buildResolvedSpec(preset);
	const colorsCss = generateColorsCss(preset);
	const globalCss = generateGlobalCss(preset, specs);
	let changedComponents: string[] = [];
	let untokenized: string[] = [];
	if (applyComponents) {
		const res = runCodemod({ componentsDir: resolve("src/components"), preset });
		changedComponents = res.changedFiles;
		untokenized = res.untokenizedFiles;
	}
	return { colorsCss, globalCss, specs, changedComponents, untokenized };
}

export function writeTheme(result: PipelineResult) {
	writeFileSync(COLORS_PATH, result.colorsCss);
	writeFileSync(GLOBAL_CSS_PATH, result.globalCss);
}
```

- [ ] **Step 2: Create the CLI entries**

Create `scripts/cli-build.ts`:

```ts
import { loadPreset, runPipeline, writeTheme, snapshotBackup } from "./pipeline";

// snapshot FIRST, write SECOND — nothing is ever written without a backup in place
const snapshot = snapshotBackup();
const preset = loadPreset();
const result = runPipeline(preset, { applyComponents: false });
writeTheme(result);
console.log("preset:build — theme written.");
console.log(`  snapshot: ${snapshot.length} files backed up to src/theme/.backup/`);
console.log(`  colors.css: ${result.colorsCss.length} bytes`);
console.log(`  global.css: ${result.globalCss.length} bytes`);
for (const u of result.untokenized) console.log(`  UNTOKENIZED: ${u}`);
```

Create `scripts/cli-codemod.ts`:

```ts
import { loadPreset, runPipeline, writeTheme, snapshotBackup, restoreBackup } from "./pipeline";

const snapshot = snapshotBackup(); // snapshot ALL css.ts + theme files first
const preset = loadPreset();
// roll back on failure — runPipeline INCLUDES the codemod, which writes component
// css.ts files; wrap BOTH the codemod writes AND writeTheme so any throw anywhere
// restores every backed-up file (mirrors the dashboard/server path). `result` is
// produced inside the guarded region so the report below can read it either way.
const result = (() => {
	try {
		const r = runPipeline(preset, { applyComponents: true });
		writeTheme(r);
		return r;
	} catch (err) {
		const restored = restoreBackup();
		console.error("preset:codemod — FAILED, restored:", restored);
		throw err;
	}
})();
console.log("preset:codemod — components tokenized.");
console.log(`  changed: ${result.changedComponents.length > 0 ? result.changedComponents.join(", ") : "(none)"}`);
if (result.untokenized.length > 0) {
	console.warn("  UNTOKENIZED (review before shipping):");
	for (const u of result.untokenized) console.warn(`    ${u}`);
}
```

Create `scripts/cli-reset.ts`:

```ts
import { restoreBackup } from "./pipeline";

const restored = restoreBackup();
if (restored.length === 0) {
	console.error("preset:reset — no backup found. Restore from git instead.");
	process.exit(1);
}
console.log(`preset:reset — restored ${restored.length} file(s) from .backup/:`);
for (const f of restored) console.log(`  ${f}`);
```

Create `scripts/cli-check.ts` — the "no component left behind" guard for CI:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { untokenizedClasses } from "./codemod";

// preset:check — default is WARN (report only, exit 0). --strict makes it fail,
// for use in CI where untokenized classes must block the merge.
const strict = process.argv.includes("--strict");
const componentsDir = resolve("src/components");
const offenders: string[] = [];
for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
	if (!dir.isDirectory()) continue;
	const file = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
	try {
		const text = readFileSync(file, "utf8");
		const found = untokenizedClasses(text);
		if (found.length > 0) offenders.push(`${dir.name}.css.ts: ${found.join(", ")}`);
	} catch {
		// no css.ts for this component dir (e.g. carousel/chart/spinner/squircle) — skip
	}
}
if (offenders.length > 0) {
	const msg = `preset:check — untokenized classes found (${offenders.length}):\n${offenders.map((o) => `  ${o}`).join("\n")}\nRun preset:codemod.`;
	if (strict) {
		console.error(msg);
		process.exit(1);
	}
	console.warn(msg);
} else {
	console.log("preset:check — all components tokenized.");
}
```

- [ ] **Step 3: Verify the scripts**

Run: `pnpm --filter @repo/shared-ui preset:codemod` — expected: components written, report printed.
Run: `pnpm --filter @repo/shared-ui preset:build` — expected: theme written, idempotent (second run = no diff).
Run: `pnpm --filter @repo/shared-ui preset:check` — expected: "all components tokenized." (or a warn list to fix).
Run: `pnpm --filter @repo/shared-ui preset:check --strict` — expected: exit 0 when tokenized; exit 1 + error list when not (the CI gate).
Run: `git diff --stat` — expected: small, reviewable diff (only css.ts files that changed).
Verify rollback: `pnpm --filter @repo/shared-ui preset:codemod`, then `pnpm --filter @repo/shared-ui preset:reset` — expected: `git status` shows no diff (backup covered all 44 css.ts + the theme files).

- [ ] **Step 4: Verify typecheck + lint**

Run: `pnpm --filter @repo/shared-ui typecheck` — expected: clean.
Run: `pnpm --filter @repo/shared-ui lint` — expected: clean (oxlint).

- [ ] **Step 5: Commit**

The script entries live in `packages/shared-ui/package.json`, which carries pre-existing uncommitted changes — do NOT `git add` it wholesale. Stage ONLY the `preset:*` script hunks (via `git add -p package.json`) and leave `pnpm-lock.yaml` untouched for the implementing user to reconcile:

```bash
git add scripts/
git add -p package.json          # stage only the preset:build/codemod/reset/check script hunks
git add src/theme/.backup/  # golden fixtures for future rollback tests
git commit -m "feat(shared-ui): add preset CLI (build, codemod, reset, check)"
```

> `pnpm-lock.yaml` is NOT staged here (it carries unrelated pre-existing changes from `pnpm install`); the implementing user reconciles it at merge time. The `preset:*` scripts themselves ARE staged in this step — they are part of this plan's deliverable, matching the `vitest`/`tsx` devDeps already staged via `git add -p` in Tasks 0 and 3. The CLI files also run standalone via `pnpm dlx tsx` in the meantime.

---

## Task 8: Regression — Storybook still renders all 44 css.ts-bearing components after tokenization

**Files:**
- None (verification task)

- [ ] **Step 1: Run Storybook and visually check**

Run: `pnpm --filter @repo/shared-ui storybook`
Open `http://localhost:6006`. Expected: every component story renders with the default theme, unchanged visuals (values were mirrored 1:1 into the default preset). Check especially: Button (default/primary/outline variants), Dialog, Card, Badge, Input, Table, Tabs, Switch, Toast. (44 of the 48 component dirs ship a `.css.ts`; carousel, chart, spinner and squircle have none and are unaffected by the codemod.)

- [ ] **Step 2: Fix any visual regression**

If a component looks wrong, the codemod mapping for it is off — fix `buildRules`/per-component rules in `scripts/codemod.ts`, re-run `preset:codemod`, re-verify.

- [ ] **Step 3: Commit any mapping fixes**

```bash
git add -A && git commit -m "fix(shared-ui): correct preset token mapping for regressed components"
```

---

## Task 9: Wire `preset:check --strict` into the repo's CI gate

**Files:**
- Modify: `.moon/tasks/all.yml` (or the package's `moon.yml` used by the shared-ui project's `typecheck` task)
- Verify passes rely on Task 0 (typecheck gate) already being green.

- [ ] **Step 1: Add the check to the task graph**

In the shared-ui moon task that `typecheck`/`lint` run, add a `preset:check --strict` step so an un-tokenized class fails the merge (spec §9 guard), matching the warn-not-fail default for local runs. Note: a `.github/workflows` run (cleanup.yml/release.yaml) may delegate to moon, so wiring here covers both.

- [ ] **Step 2: Verify a red option actually fails**

Add a temporary `bg-red-500` class to one css.ts, run the gate → must fail. Remove it, run again → pass. (Guarantees the gate is wired, not dead.)

- [ ] **Step 3: Commit**

```bash
git add .moon/ .github/workflows/ 2>/dev/null || git add .moon/
git commit -m "ci(shared-ui): fail preset:check --strict on untokenized classes"
```

---

## Plan self-review (done by the author — verified against spec §4–§12)

- **Spec coverage:** §4 schema (base `fonts`/`radius.base` + `radiusGroups` + per-component `components.*.radius`/`sizes`) → Task 2; §4.1 three-tier component > group > base inheritance → `component-map.ts` (Task 5); §5 conversion engine (per-mode `convertValue`) → Task 4; §6 save pipeline (snapshot → resolve → codemod → codegen → write; restore on failure) → Tasks 5–7; §8 scripts `preset:build/codemod/reset/check` → Tasks 3+7 (`preset` dashboard script deferred to dashboard plan); §9 guard → `preset:check` (warn default, `--strict` fails) Task 7 + Task 9 wiring into moon/CI; §11 testing → Tasks 2/4/5/6 tests + Task 8 regression; §13 spike → Task 1. §7 dashboard + §10 workflow steps 4–7 → dashboard plan.
- **Placeholder scan:** no TBD/TODO; every code step is complete. The codemod rule list is deliberately minimal-but-real, and Task 6 Step 5 explicitly resolves remaining per-component mappings with the guard reporting residuals.
- **Type consistency:** `convertValue` is imported (`./conversion`) and applied per-mode in `codegen.ts` for the base radius and every semantic radius, so the emitted values match the dashboard preview (`ResolvedValue.value/className/display/varName/snapped/delta`); container widths use the pre-resolved `widthValue` from `buildResolvedSpec`, which runs the same engine. The widened Task 0 tsconfig (`include: ["src","scripts","tests","vitest.config.ts",".storybook"]`) now actually typechecks `scripts/`, `tests/`, and all 44 component files (incl. `toggle-group`) — so the code blocks' `import`/type use is real. The three-tier `components.*.radius` override flows **component → group → base**: `resolveComponentRadius` returns `inherit` when absent, else the `token` carrying the component name (override), else the group name, else `"inherit"` — consumed by both `codegen.ts` and `codemod.ts`. `transformCssTs(sourceText, componentName, radiusToken|"inherit", sizes, widthPrefix)` matches its test call sites. `snapshotBackup`/`restoreBackup` cover the theme files AND all 44 component css.ts, and are called before `runPipeline`/`writeTheme` so a rollback restores both codemod writes and theme writes.
- **Task ordering:** Task 0 (typecheck gate) must land first — Tasks 5–7's "Expected: PASS" steps assume a green `typecheck`; the plan's own affected blocks keep the builder script (`builder/shared-ui.sh`) and all 44 component css.ts intact, and route `preset:build` wait until Task 7 ships the CLI (Task 3 note).
- **What this plan DOES to `package.json` (kept honest):** it scope-edits `packages/shared-ui/package.json` — the `vitest` devDep (Task 0 Step 2), the `tsx` devDep + script entries (Task 3), and the `preset:*` CLI script entries (Task 7) — each staged via `git add -p package.json` so only the intended hunks land around the pre-existing uncommitted changes; `pnpm-lock.yaml` is never staged and is deferred to the implementing user's merge reconcile. It does not remove `baseUrl` beyond the Task 0 tsconfig edit (which is scoped to the typecheck gate). It does not ship the dashboard UI — that is the dashboard plan. Every claim above is traceable to a concrete function, file, or task in this plan; where a step depends on a later task (e.g. `preset:*` CLIs), the dependency is called out explicitly so the "Expected:" lines stay honest.
