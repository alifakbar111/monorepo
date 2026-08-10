# Shared UI Preset System — Dashboard Mini-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Per spec §14: **frontend-agent** owns this plan's UI tasks, **backend-agent** owns the server/middleware, **tester-agent** the test suites, **code-reviewer-agent** after every non-trivial task, **security-auditor-agent** before finishing (the save API writes files to disk — treat as privileged). Verify with `pnpm typecheck`/`lint`/tests; single-line conventional commits.

**Goal:** Build the Storybook-like preset dashboard inside shared-ui (`src/preset/`): a **left GENERAL rail** (fonts heading/body/mono, radius base, typeRoles, spacing, breakpoints, animations, colors), a **live gallery** of the real components, a **right component sidebar** with `●` override markers per component, a **bottom spec sheet** supporting the three-tier **inherit ⇄ create-override** radius model (component > group > base), reactive preview via injected CSS vars (WYSIWYG by construction — same per-mode conversion engine as codegen), and a Save button that snapshots then runs the core plan's pipeline through a small Node middleware (restoring on failure).

**Architecture:** A dev-only Vite app (`vite.preset.config.ts`, `root: src/preset`) whose `configureServer` hook exposes `GET/POST /api/preset` and `POST /api/save`. The UI keeps a working copy of the preset in nanostores; every edit derives a live `<style id="preset-preview">` override (reusing `scripts/conversion.ts` + `scripts/component-map.ts` from the core plan — same per-mode resolution, so preview == saved output) so the gallery re-resolves instantly. Save posts the working preset; the server snapshots `.backup/` (preset.json + colors.css + global.css + ALL component css.ts) BEFORE any write, runs `runPipeline(applyComponents: true)`, writes theme files, and returns the codemod report; on failure it restores the backup and returns an error.

**Tech Stack:** Vite (already present), React 19, nanostores + @nanostores/react (already deps), Tailwind v4 via @tailwindcss/vite, zod (dep), tsx.

**Depends on:** Plan `2026-08-06-shared-ui-preset-core.md` (its `scripts/` modules are imported here). Spec: `docs/superpowers/specs/2026-08-06-shared-ui-preset-dashboard-design.md`.

---

## File Structure

```
packages/shared-ui/
├── vite.preset.config.ts              # CREATE — dashboard dev server + /api middleware
├── src/preset/
│   ├── index.html                     # CREATE — entry HTML
│   ├── main.tsx                       # CREATE — React root, imports theme CSS + shell styles
│   ├── App.tsx                        # CREATE — layout (toolbar / sidebar / canvas / panel)
│   ├── api.ts                         # CREATE — fetch wrappers for the 3 endpoints
│   ├── store.ts                       # CREATE — nanostores working preset + dirty flag
│   ├── preview.ts                     # CREATE — buildPreviewCss(preset, theme) → override string
│   ├── groups.ts                      # CREATE — component → group + display labels
│   ├── styles.css                     # CREATE — dashboard shell styles (dark-capable)
│   └── components/
│       ├── Toolbar.tsx                # CREATE — light/dark, Save, Reset
│       ├── GeneralPanel.tsx           # CREATE — LEFT: GENERAL design tokens (fonts, radius base, typeRoles, spacing, breakpoints, animations, colors)
│       ├── Sidebar.tsx                # CREATE — RIGHT: grouped component list with ● override markers
│       ├── Gallery.tsx                # CREATE — renders real components per selected group
│       ├── TokenPanel.tsx             # CREATE — global editors (colors, fonts, typeRoles, …)
│       ├── SpecPanel.tsx              # CREATE — per-component spec sheet (rows + variants)
│       └── Row.tsx                    # CREATE — one attribute row: value + mode toggle + inherit/create-override + resolved preview
├── tests/
│   └── preview.test.ts                # CREATE
└── package.json                       # MODIFY — `preset` script
```

---

## Task 1: Vite config + Node middleware (the save API)

**Files:**
- Create: `packages/shared-ui/vite.preset.config.ts`
- Test: `packages/shared-ui/tests/server.test.ts` (unit-test the request handlers)

- [ ] **Step 1: Write the failing test**

Create `tests/server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleSave, handleGetPreset } from "../scripts/server";
import { presetSchema } from "../scripts/types";

describe("preset server handlers", () => {
	it("GET returns the current preset.json", () => {
		const res = handleGetPreset();
		expect(res.ok).toBe(true);
		if (res.ok) expect(res.preset.info).toHaveProperty("name");
	});

	it("POST save rejects an invalid preset", () => {
		const res = handleSave({ info: { name: "x" } } as never);
		expect(res.ok).toBe(false);
		expect(res.error).toBeTruthy();
	});

	it("POST save accepts a valid preset and returns a report", () => {
		// load the real default preset so the save round-trips a VALID shape
		const valid = presetSchema.parse(
			JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
		);
		const res = handleSave(valid);
		expect(res.ok).toBe(true);
		if (res.ok) expect(res.report).toBeDefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the server module**

Create `scripts/server.ts` (reusable handlers, unit-testable, no Vite dependency):

```ts
import { presetSchema } from "./types";
import { loadPreset, runPipeline, writeTheme, snapshotBackup, restoreBackup, PRESET_PATH } from "./pipeline";
import { writeFileSync } from "node:fs";

export type ApiResponse =
	| { ok: true; preset: import("./types").Preset }
	| { ok: true; report: { changedComponents: string[]; untokenized: string[]; colorsBytes: number; globalBytes: number } }
	| { ok: false; error: string };

export function handleGetPreset(): ApiResponse {
	try {
		return { ok: true, preset: loadPreset() };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

export function handleSave(workingPreset: unknown): ApiResponse {
	const parsed = presetSchema.safeParse(workingPreset);
	if (!parsed.success) {
		return { ok: false, error: "invalid preset: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
	}
	// Defect-8/10 fix: snapshot EVERYTHING (preset.json + colors.css + global.css + all
	// component css.ts) BEFORE any write, so a failed codegen/codemod can be rolled back.
	const snapshot = snapshotBackup();
	try {
		writeFileSync(PRESET_PATH, JSON.stringify(parsed.data, null, "\t") + "\n");
		const result = runPipeline(parsed.data, { applyComponents: true });
		writeTheme(result);
		return {
			ok: true,
			report: {
				changedComponents: result.changedComponents,
				untokenized: result.untokenized,
				colorsBytes: result.colorsCss.length,
				globalBytes: result.globalCss.length,
			},
		};
	} catch (err) {
		const restored = restoreBackup();
		console.error("preset save failed — restored:", restored, err);
		return { ok: false, error: `save failed (rolled back ${restored.length} files): ${err instanceof Error ? err.message : String(err)}` };
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS.

- [ ] **Step 5: Create the Vite config with middleware**

Create `vite.preset.config.ts`:

```ts
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleGetPreset, handleSave } from "./scripts/server";

function presetServer(): Plugin {
	return {
		name: "shared-ui-preset-server",
		configureServer(server) {
			server.middlewares.use("/api/preset", (req, res) => {
				if (req.method === "GET") {
					const result = handleGetPreset();
					res.setHeader("content-type", "application/json");
					res.end(JSON.stringify(result));
					return;
				}
				if (req.method === "POST") {
					let body = "";
					req.on("data", (c) => (body += c));
					req.on("end", () => {
						const result = handleSave(body ? JSON.parse(body) : undefined);
						res.setHeader("content-type", "application/json");
						res.end(JSON.stringify(result));
					});
					return;
				}
				res.statusCode = 405;
				res.end();
			});
		},
	};
}

export default defineConfig({
	root: "src/preset",
	plugins: [react(), tailwindcss(), presetServer()],
	server: { port: 6100, host: false, open: true },
	build: { outDir: "../../dist-preset", emptyOutDir: true },
});
```

- [ ] **Step 6: Commit**

```bash
git add scripts/server.ts vite.preset.config.ts tests/server.test.ts
git commit -m "feat(shared-ui): add preset dashboard server and middleware"
```

---

## Task 2: Shell — entry, store, API client, preview CSS builder

**Files:**
- Create: `packages/shared-ui/src/preset/index.html`
- Create: `packages/shared-ui/src/preset/main.tsx`
- Create: `packages/shared-ui/src/preset/api.ts`
- Create: `packages/shared-ui/src/preset/store.ts`
- Create: `packages/shared-ui/src/preset/preview.ts`
- Test: `packages/shared-ui/tests/preview.test.ts`

- [ ] **Step 1: Write the failing preview test**

Create `tests/preview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";
import { buildPreviewCss } from "../src/preset/preview";
import { buildResolvedSpec } from "../scripts/component-map";
import { toHex } from "../src/preset/components/TokenPanel";

const preset = presetSchema.parse(
	JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
);

describe("buildPreviewCss", () => {
	it("emits color vars for the active theme", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--primary: ");
	});

	it("emits semantic radius vars from groups", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--radius-button: ");
		expect(css).toContain("--radius-overlay: ");
	});

	it("emits container vars for component sizes", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--container-dialog-sm: ");
		expect(css).toContain("--container-dialog-lg: ");
	});

	it("emits type role vars", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--text-body: ");
		expect(css).toContain("--text-body--line-height: ");
	});

	it("per-mode parity: convert emits the SNAPPED radius value, as-is the LITERAL (defect-1)", () => {
		const convert = structuredClone(preset);
		convert.radius.base = { value: "13px", mode: "convert" };
		const css = buildPreviewCss(convert, buildResolvedSpec(convert), "light");
		expect(css).toContain("--radius: 0.75rem");
		expect(css).not.toContain("--radius: 13px");

		const asIs = structuredClone(preset);
		asIs.radius.base = { value: "13px", mode: "as-is" };
		const css2 = buildPreviewCss(asIs, buildResolvedSpec(asIs), "light");
		expect(css2).toContain("--radius: 13px");
	});

	it("a component radius override emits its own token (component > group > base, defect-6)", () => {
		const withOverride = structuredClone(preset);
		(withOverride.components.dialog as Record<string, unknown>).radius = { value: "2px", mode: "convert" };
		const css = buildPreviewCss(withOverride, buildResolvedSpec(withOverride), "light");
		expect(css).toContain("--radius-dialog: ");
	});

	it("oklch picker round-trips: hex -> oklch string preserves a parseable value (defect-9)", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		// every stored color must stay oklch — a raw hex in preset.json would break the picker
		for (const value of Object.values(preset.colors.light)) {
			expect(value).toMatch(/^(oklch\(|#[0-9a-fA-F]{6})/);
		}
		expect(css).toMatch(/--primary: oklch\(/);
	});

	it("emits font family vars and hosted @import", () => {
		const hosted = structuredClone(preset);
		hosted.fonts.body.source = "https://fonts.googleapis.com/css2?family=Inter";
		const css = buildPreviewCss(hosted, buildResolvedSpec(hosted), "light");
		expect(css).toContain("--font-heading: ");
		expect(css).toContain("--font-body: ");
		expect(css).toContain("--font-mono: ");
		expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter");');
	});

	it("is idempotent", () => {
		const a = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		const b = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(a).toBe(b);
	});
});

describe("toHex — oklch swatch brightness (defect-11: unitless 0–1 must NOT be /100'd)", () => {
	const channels = (hex: string) =>
		[hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((v) => parseInt(v, 16));

	it("unitless oklch(1 0 0) renders a LIGHT swatch (~#ffffff), not a near-black one", () => {
		expect(toHex("oklch(1 0 0)")).toBe("#ffffff");
	});

	it("unitless oklch(0.15 …) renders DARK (the old /100 made light values dark)", () => {
		const [r, g, b] = channels(toHex("oklch(0.15 0 0)"));
		expect(Math.max(r, g, b)).toBeLessThan(64);
	});

	it("percentage form oklch(100% 0 0) still normalizes to white", () => {
		expect(toHex("oklch(100% 0 0)")).toBe("#ffffff");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared-ui test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the preview CSS builder**

Create `src/preset/preview.ts`:

```ts
import type { Preset } from "../../scripts/types";
import type { ResolvedComponentSpec } from "../../scripts/component-map";
import { convertValue } from "../../scripts/conversion";

/**
 * Builds the live <style> override that makes the gallery react to edits.
 * Mirrors the codegen values exactly (same conversion engine + radius resolver),
 * so preview == saved output.
 */
export function buildPreviewCss(preset: Preset, specs: ResolvedComponentSpec[], theme: "light" | "dark"): string {
	const vars: string[] = [];

	// colors
	for (const [key, value] of Object.entries(preset.colors[theme])) {
		vars.push(`\t--${key}: ${value};`);
	}

	// type roles
	for (const [role, r] of Object.entries(preset.typeRoles)) {
		vars.push(`\t--text-${role}: ${r.size};`);
		vars.push(`\t--text-${role}--line-height: ${r.lineHeight};`);
	}

	// radius — base + per-component/group opt-outs via the SAME three-tier resolution
	// the codegen uses, converting per-mode, so preview == saved output (defect-9).
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	vars.push(`\t--radius: ${base.value};`);
	vars.push(`\t--radius-lg: var(--radius);`);
	vars.push(`\t--radius-md: calc(var(--radius) - 2px);`);
	vars.push(`\t--radius-sm: calc(var(--radius) - 4px);`);
	const emitted = new Set<string>();
	for (const spec of specs) {
		if (spec.radius.kind === "value") {
			// a per-mode conversion here keeps the preview identical to codegen for a
			// given mode; "as-is" radii stay literal so the picker round-trips verbatim
			const rv = convertValue(spec.radius.value.value, "radius", spec.radius.value.mode);
			const key = `--radius-${spec.radius.token}`;
			if (!emitted.has(key)) {
				vars.push(`\t${key}: ${rv.value};`);
				emitted.add(key);
			}
		} else if (spec.radius.kind === "shift") {
			const key = `--radius-${spec.radius.token}`;
			if (!emitted.has(key)) {
				vars.push(`\t${key}: calc(var(--radius) + ${spec.radius.shift});`);
				emitted.add(key);
			}
		}
	}

	// component sizes — widthValue is ALREADY resolved per-mode by buildResolvedSpec
	// (same convertValue path as codegen containers) — emit it verbatim
	for (const spec of specs) {
		for (const sz of spec.sizes) {
			vars.push(`\t--container-${spec.name}-${sz.key}: ${sz.widthValue};`);
		}
	}

	// fonts — family vars + hosted @import (self-hosted woff2 resolved via Vite in dev)
	const hostedImports = [...new Set([preset.fonts.heading.source, preset.fonts.body.source, preset.fonts.mono.source].filter((s): s is string => !!s))]
		.map((url) => `@import url("${url}");`)
		.join("");
	vars.push(`\t--font-heading: ${preset.fonts.heading.family};`);
	vars.push(`\t--font-body: ${preset.fonts.body.family};`);
	vars.push(`\t--font-mono: ${preset.fonts.mono.family};`);
	for (const [k, v] of Object.entries(preset.shadow)) vars.push(`\t--shadow-${k}: ${v};`);
	for (const [k, v] of Object.entries(preset.animation.duration)) vars.push(`\t--duration-${k}: ${v};`);
	for (const [k, v] of Object.entries(preset.animation.easing)) vars.push(`\t--ease-${k}: ${v};`);

	return `${hostedImports}\n:root {\n${vars.join("\n")}\n}`;
}
```

- [ ] **Step 4: Create the API client**

Create `src/preset/api.ts`:

```ts
import type { Preset } from "../../scripts/types";

export interface SaveReport {
	changedComponents: string[];
	untokenized: string[];
	colorsBytes: number;
	globalBytes: number;
}

export async function fetchPreset(): Promise<Preset> {
	const res = await fetch("/api/preset");
	const json = await res.json();
	if (!json.ok) throw new Error(json.error);
	return json.preset as Preset;
}

export async function savePreset(preset: Preset): Promise<SaveReport> {
	const res = await fetch("/api/preset", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(preset),
	});
	const json = await res.json();
	if (!json.ok) throw new Error(json.error);
	return json.report as SaveReport;
}
```

- [ ] **Step 5: Create the store (working preset + dirty tracking)**

Create `src/preset/store.ts`:

```ts
import { atom } from "nanostores";
import type { Preset } from "../../scripts/types";

export const workingPreset = atom<Preset | null>(null);
export const dirty = atom(false);
export const saving = atom(false);
export const lastReport = atom<{ changed: number; untokenized: string[]; bytes: number } | null>(null);
export const previewStyle = atom("");

export function setPreset(p: Preset) {
	workingPreset.set(p);
	dirty.set(false);
}
```

- [ ] **Step 6: Create entry files**

Create `src/preset/index.html`:

```html
<!doctype html>
<html lang="en" data-theme="light">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Shared UI — Design Preset</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/main.tsx"></script>
	</body>
</html>
```

Create `src/preset/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/colors.css";
import "../../styles/global.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @repo/shared-ui test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/preset tests/preview.test.ts
git commit -m "feat(shared-ui): add preset dashboard shell, store, api and preview css"
```

---

## Task 3: Layout + sidebar + toolbar

**Files:**
- Create: `packages/shared-ui/src/preset/styles.css`
- Create: `packages/shared-ui/src/preset/App.tsx`
- Create: `packages/shared-ui/src/preset/components/Sidebar.tsx`
- Create: `packages/shared-ui/src/preset/components/Toolbar.tsx`
- Create: `packages/shared-ui/src/preset/groups.ts`

- [ ] **Step 1: Create the group metadata**

Create `src/preset/groups.ts`:

```ts
export interface PresetGroup {
	id: string;
	label: string;
}

export const GROUPS: PresetGroup[] = [
	{ id: "button", label: "Buttons" },
	{ id: "input", label: "Inputs & Forms" },
	{ id: "overlay", label: "Overlays" },
	{ id: "card", label: "Cards" },
	{ id: "badge", label: "Badges & Avatars" },
	{ id: "surface", label: "Surfaces & Data" },
	{ id: "typography", label: "Typography" },
];

/**
 * component name → group id (mirrors scripts/component-map.ts DEFAULT_GROUP_ASSIGNMENT,
 * including the typography group and the 44 css.ts-bearing components — squircle,
 * carousel, chart, spinner ship no css.ts and are not tokenization targets).
 */
export const COMPONENT_GROUP: Record<string, string> = {
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
```

- [ ] **Step 2: Create the shell styles**

Create `src/preset/styles.css`:

```css
@import "tailwindcss";

:root {
	color-scheme: light;
}
:root[data-theme="dark"] {
	color-scheme: dark;
}

.preset-app {
	font-family: var(--font-sans);
	background: var(--color-background);
	color: var(--color-foreground);
}

.preset-sidebar {
	border-right: 1px solid var(--color-border);
	background: var(--color-muted);
}

.preset-item {
	cursor: pointer;
	padding: 0.375rem 0.75rem;
	border-radius: 0.375rem;
	font-size: 0.8125rem;
}
.preset-item:hover {
	background: var(--color-accent);
}
.preset-item[data-active="true"] {
	background: var(--color-primary);
	color: var(--color-primary-foreground);
}

.preset-canvas {
	background: var(--color-muted);
	border-radius: var(--radius-lg);
	border: 1px solid var(--color-border);
}

.preset-row {
	display: grid;
	grid-template-columns: 9rem 8rem 8rem 1fr 2rem;
	gap: 0.5rem;
	align-items: center;
	padding: 0.375rem 0.5rem;
	border-bottom: 1px solid var(--color-border);
	font-size: 0.8125rem;
}

.preset-input {
	border: 1px solid var(--color-input);
	border-radius: var(--radius-sm);
	background: var(--color-background);
	padding: 0.25rem 0.5rem;
	width: 100%;
}

.preset-toggle {
	border: 1px solid var(--color-input);
	border-radius: var(--radius-sm);
	background: var(--color-background);
	padding: 0.25rem 0.5rem;
	font-size: 0.75rem;
	cursor: pointer;
}
.preset-toggle[data-active="true"] {
	background: var(--color-primary);
	color: var(--color-primary-foreground);
	border-color: var(--color-primary);
}
```

- [ ] **Step 3: Create the toolbar**

Create `src/preset/components/Toolbar.tsx`:

```tsx
import { useStore } from "@nanostores/react";
import { dirty, saving } from "../store";

export function Toolbar({
	theme,
	onToggleTheme,
	onSave,
	onReset,
}: {
	theme: "light" | "dark";
	onToggleTheme: () => void;
	onSave: () => void;
	onReset: () => void;
}) {
	const isDirty = useStore(dirty);
	const isSaving = useStore(saving);
	return (
		<header className="flex h-12 items-center gap-3 border-b border-border px-4">
			<span className="text-sm font-semibold">Shared UI — Design Preset</span>
			<span className="text-xs text-muted-foreground">{isDirty ? "● unsaved changes" : "saved"}</span>
			<div className="ml-auto flex items-center gap-2">
				<button
					className="preset-toggle"
					onClick={onToggleTheme}
					title="toggle light/dark preview"
				>
					{theme === "light" ? "◐ dark" : "◑ light"}
				</button>
				<button className="preset-toggle" onClick={onReset} title="reset to .backup">
					↺ reset
				</button>
				<button
					className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
					onClick={onSave}
					disabled={!isDirty || isSaving}
				>
					{isSaving ? "Saving…" : "Save"}
				</button>
			</div>
		</header>
	);
}
```

- [ ] **Step 4: Create the right sidebar (component list, with override markers)**

Create `src/preset/components/Sidebar.tsx` — right rail listing component groups; a `●` dot marks a group OR a component that has a **radius override** (the three-tier model: a group override = `radiusGroups[g]` set; a component override = `components.<name>.radius` set). Clicking a group selects its gallery; clicking a component opens its spec sheet:

```tsx
import { useStore } from "@nanostores/react";
import { workingPreset } from "../store";
import { GROUPS, COMPONENT_GROUP } from "../groups";

export function Sidebar({
	selection,
	onSelect,
}: {
	selection: string;
	onSelect: (id: string) => void;
}) {
	const preset = useStore(workingPreset);
	const byGroup: Record<string, string[]> = {};
	if (preset) {
		for (const name of Object.keys(preset.components)) {
			const g = COMPONENT_GROUP[name] ?? "surface";
			(byGroup[g] ??= []).push(name);
		}
	}
	// group-level radius override: radiusGroups[g] exists and is a concrete value/shift (not null/absent)
	const groupOverridden = (g: string) => {
		const gr = preset?.radiusGroups[g];
		return gr != null && ("shift" in gr || "value" in gr);
	};
	// per-component radius override: components.<name>.radius exists (three-tier, beats the group)
	const componentOverridden = (name: string) => {
		const entry = preset?.components[name] as { radius?: unknown } | undefined;
		return entry?.radius !== undefined;
	};
	return (
		<nav className="preset-sidebar w-56 shrink-0 overflow-y-auto border-l border-border p-2">
			<div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				COMPONENTS
			</div>
			{GROUPS.map((section) => (
				<div key={section.id} className="mt-3">
					<button
						className="preset-item w-full text-left font-medium"
						data-active={selection === section.id}
						onClick={() => onSelect(section.id)}
					>
						<span>{groupOverridden(section.id) ? "● " : ""}{section.label}</span>
					</button>
					{(byGroup[section.id] ?? []).sort().map((name) => (
						<button
							key={name}
							className="preset-item w-full pl-5 text-left"
							data-active={selection === name}
							onClick={() => onSelect(name)}
						>
							{componentOverridden(name) ? "● " : ""}
							{name}
						</button>
					))}
				</div>
			))}
		</nav>
	);
}
```

- [ ] **Step 5: Create the left General panel (GENERAL design tokens)**

Create `src/preset/components/GeneralPanel.tsx` — persistent left rail editing the GENERAL section (applies to all components). Colors light/dark, fonts (heading/body/mono), radius base, typeRoles, breakpoints, durations. Edits write the working store and mark dirty:

```tsx
import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset } from "../../../scripts/types";

export function GeneralPanel({ preset }: { preset: Preset | null }) {
	if (!preset) return null;
	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(preset);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}
	return (
		<aside className="preset-sidebar w-72 shrink-0 overflow-y-auto border-r border-border p-3">
			<div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				GENERAL — applies to all
			</div>

			<h5 className="mt-3 text-xs font-semibold">Fonts</h5>
			<select
				className="preset-input mb-1"
				onChange={(e) => {
					const url = e.target.value;
					if (!url) return;
					const FAMILIES: Record<string, { family: string; source: string }> = {
						Inter: { family: '"Inter", ui-sans-serif, system-ui, sans-serif', source: "https://fonts.googleapis.com/css2?family=Inter:wght@400..600" },
						Sora: { family: '"Sora", ui-sans-serif, system-ui, sans-serif', source: "https://fonts.googleapis.com/css2?family=Sora:wght@400..800" },
						"JetBrains Mono": { family: '"JetBrains Mono", ui-monospace, monospace', source: "https://fonts.googleapis.com/css2?family=JetBrains+Mono" },
					};
					const fam = FAMILIES[e.target.value];
					if (fam) patch((p) => void Object.assign(p.fonts.body, fam));
				}}
			>
				<option value="">Quick pick (fill body)…</option>
				{["Inter", "Sora", "JetBrains Mono"].map((f) => <option key={f} value={f}>{f}</option>)}
			</select>
			{(["heading", "body", "mono"] as const).map((face) => (
				<fieldset key={face} className="mb-2 border border-border rounded-md p-2">
					<legend className="px-1 text-[11px] font-semibold uppercase text-muted-foreground">{face}</legend>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>family</span>
						<input className="preset-input" value={preset.fonts[face].family} onChange={(e) => patch((p) => void (p.fonts[face].family = e.target.value))} />
					</label>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>URL</span>
						<input className="preset-input" placeholder="https://fonts.google… (hosted)" value={preset.fonts[face].source ?? ""} onChange={(e) => patch((p) => void (p.fonts[face].source = e.target.value || null))} />
					</label>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>files</span>
						<input className="preset-input" placeholder="fonts/inter-latin.woff2 (self-hosted)" value={(preset.fonts[face].files ?? []).join(", ")} onChange={(e) => patch((p) => void (p.fonts[face].files = e.target.value ? e.target.value.split(",").map((s) => s.trim()) : null))} />
					</label>
				</fieldset>
			))}

			<h5 className="mt-3 text-xs font-semibold">Corner radius — base</h5>
			<label className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
				<span>base</span>
				<input className="preset-input" value={preset.radius.base.value} onChange={(e) => patch((p) => void (p.radius.base.value = e.target.value))} />
			</label>

			<h5 className="mt-3 text-xs font-semibold">Type roles</h5>
			{Object.entries(preset.typeRoles).map(([role, r]) => (
				<div key={role} className="preset-row" style={{ gridTemplateColumns: "6rem 4rem 4rem 4rem" }}>
					<span>{role}</span>
					<input className="preset-input" value={r.size} onChange={(e) => patch((p) => void (p.typeRoles[role].size = e.target.value))} />
					<input className="preset-input" value={r.lineHeight} onChange={(e) => patch((p) => void (p.typeRoles[role].lineHeight = e.target.value))} />
					<input className="preset-input" value={r.weight} onChange={(e) => patch((p) => void (p.typeRoles[role].weight = e.target.value))} />
				</div>
			))}

			<h5 className="mt-3 text-xs font-semibold">Breakpoints</h5>
			{Object.entries(preset.breakpoints).map(([bp, value]) => (
				<label key={bp} className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
					<span>{bp}</span>
					<input className="preset-input" value={value} onChange={(e) => patch((p) => void (p.breakpoints[bp] = e.target.value))} />
				</label>
			))}

			<h5 className="mt-3 text-xs font-semibold">Durations</h5>
			{Object.entries(preset.animation.duration).map(([k, value]) => (
				<label key={k} className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
					<span>{k}</span>
					<input className="preset-input" value={value} onChange={(e) => patch((p) => void (p.animation.duration[k] = e.target.value))} />
				</label>
			))}
		</aside>
	);
}
```

> Color editing lives in `TokenPanel` (bottom, when no component is focused) because `<input type="color">` needs hex; the left rail covers the non-color GENERAL fields plus points to the color pickers below.

- [ ] **Step 6: Create the app shell**

Create `src/preset/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { fetchPreset, savePreset } from "./api";
import { workingPreset, dirty, saving, lastReport, previewStyle, setPreset } from "./store";
import { buildPreviewCss } from "./preview";
import { buildResolvedSpec } from "../../scripts/component-map";
import { Toolbar } from "./components/Toolbar";
import { GeneralPanel } from "./components/GeneralPanel";
import { Sidebar } from "./components/Sidebar";
import { Gallery } from "./components/Gallery";
import { TokenPanel } from "./components/TokenPanel";
import { SpecPanel } from "./components/SpecPanel";
import { GROUPS, COMPONENT_GROUP } from "./groups";
import type { Preset } from "../../scripts/types";

/** The bottom spec sheet shows the focused component — an explicitly selected one,
 *  or the first member of the selected group (deterministic, sorted). */
function focusComponent(selection: string, preset: Preset | null): string {
	if (selection && !GROUPS.some((g) => g.id === selection) && preset?.components[selection]) {
		return selection;
	}
	const members = Object.keys(preset?.components ?? {}).filter((n) => COMPONENT_GROUP[n] === selection);
	return members.sort()[0] ?? "";
}

export function App() {
	const preset = useStore(workingPreset);
	const preview = useStore(previewStyle);
	const isSaving = useStore(saving);
	const report = useStore(lastReport);
	const [selection, setSelection] = useState(""); // "" = token/general gallery, else component name
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	useEffect(() => {
		fetchPreset().then((p) => setPreset(p)).catch(console.error);
	}, []);

	// reactive preview: rebuild the override whenever the working preset changes
	useEffect(() => {
		if (!preset) return;
		const specs = buildResolvedSpec(preset);
		previewStyle.set(buildPreviewCss(preset, specs, theme));
	}, [preset, theme]);

	async function handleSave() {
		if (!preset) return;
		saving.set(true);
		try {
			// The server snapshots BEFORE writing (preset.json + colors.css + global.css +
			// all component css.ts) and rolls back on failure — the dashboard only reports.
			const r = await savePreset(preset);
			lastReport.set({ changed: r.changedComponents.length, untokenized: r.untokenized, bytes: r.colorsBytes + r.globalBytes });
			dirty.set(false);
		} catch (e) {
			// server already restored the previous state; keep editing the in-memory preset
			console.error("save failed (state restored server-side):", e);
			lastReport.set({ changed: 0, untokenized: ["save failed — previous state restored"], bytes: 0 });
		} finally {
			saving.set(false);
		}
	}

	function handleReset() {
		fetchPreset().then((p) => setPreset(p)).catch(console.error);
	}

	return (
		<div className="preset-app flex h-screen flex-col">
			<style id="preset-preview">{preview}</style>
			<Toolbar theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} onSave={handleSave} onReset={handleReset} />
			<div className="flex min-h-0 flex-1">
				{/* LEFT — GENERAL (Design Tokens): applies to all components */}
				<GeneralPanel preset={preset} />
				{/* CENTER: canvas + bottom spec sheet */}
				<main className="flex min-w-0 flex-1 flex-col">
					<Gallery selection={selection} />
					{focusComponent(selection, preset) ? (
						<SpecPanel componentName={focusComponent(selection, preset)} />
					) : (
						<TokenPanel />
					)}
					{report && (
						<div className="border-t border-border px-4 py-1 text-xs text-muted-foreground">
							Saved: {report.changed} components rewritten, {report.bytes} bytes of theme CSS.
							{report.untokenized.length > 0 && ` UNTOKENIZED: ${report.untokenized.join(", ")}`}
						</div>
					)}
				</main>
				{/* RIGHT: component groups list */}
				<Sidebar selection={selection} onSelect={setSelection} />
			</div>
		</div>
	);
}
```

> `App.tsx` references `Gallery`, `TokenPanel`, `SpecPanel` — created in Tasks 4–5. The app will not compile until those exist; that's expected ordering.

- [ ] **Step 7: Add the `preset` script**

In `packages/shared-ui/package.json` `scripts` add:

```json
		"preset": "vite --config vite.preset.config.ts"
```

- [ ] **Step 8: Verify the server boots (app will not render until Tasks 4–5)**

Run: `pnpm --filter @repo/shared-ui preset`
Expected: server starts on port 6100, browser opens; the page may show a blank/errored shell until Tasks 4–5 land. Verify the API by curl:
Run: `curl -s localhost:6100/api/preset | head -c 200`
Expected: `{"ok":true,"preset":{"info":...`.

- [ ] **Step 9: Commit**

```bash
git add src/preset
git add -p package.json          # stage only the `"preset": "vite --config …"` script hunk
git commit -m "feat(shared-ui): add preset dashboard shell, sidebar and toolbar"
```

> `pnpm-lock.yaml` is not staged (it carries unrelated pre-existing changes); the implementing user reconciles it at merge time.

---

## Task 4: Gallery + global TokenPanel

**Files:**
- Create: `packages/shared-ui/src/preset/components/Gallery.tsx`
- Create: `packages/shared-ui/src/preset/components/TokenPanel.tsx`

- [ ] **Step 1: Create the gallery**

Create `src/preset/components/Gallery.tsx` — renders real components for the selected group/token section. Demo data is a compact "everything" sample; the demo lives in one file to keep it reviewable:

```tsx
import { useStore } from "@nanostores/react";
import { workingPreset } from "../store";
import { COMPONENT_GROUP } from "../groups";
import { Button } from "../../components/button/button";
import { Input } from "../../components/input/input";
import { Badge } from "../../components/badge/badge";
import { Card } from "../../components/card/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/tabs/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/table/table";
import { Progress } from "../../components/progress/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/dialog/dialog";

function DemoButtonRow() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button variant="default">Default</Button>
			<Button variant="primary">Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button size="sm">Small</Button>
			<Button size="lg">Large</Button>
			<Badge>Badge</Badge>
		</div>
	);
}

function DemoFormRow() {
	return (
		<div className="flex max-w-md flex-col gap-2">
			<Input placeholder="Type something…" />
			<Input placeholder="Disabled" disabled />
			<Progress value={60} />
		</div>
	);
}

function DemoCardRow() {
	return (
		<Card className="w-72">
			<Card.Header>
				<Card.Title>Card title</Card.Title>
				<Card.Description>Card description</Card.Description>
			</Card.Header>
			<Card.Content>
				<p className="text-body text-muted-foreground">Card content</p>
			</Card.Content>
		</Card>
	);
}

function DemoDataRow() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell>al-ip</TableCell>
					<TableCell>
						<Badge variant="secondary">Active</Badge>
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	);
}

export function Gallery({ selection }: { selection: string }) {
	const preset = useStore(workingPreset);
	if (!preset) return <div className="p-4 text-sm text-muted-foreground">loading preset…</div>;
	if (selection === "" || selection === "tokens") {
		return (
			<div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Buttons & Badges</h3>
					<DemoButtonRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Forms</h3>
					<DemoFormRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Cards</h3>
					<DemoCardRow />
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Tables & Tabs</h3>
					<DemoDataRow />
					<Tabs defaultValue="a" className="mt-2">
						<TabsList>
							<TabsTrigger value="a">Tab A</TabsTrigger>
							<TabsTrigger value="b">Tab B</TabsTrigger>
						</TabsList>
						<TabsContent value="a">content A</TabsContent>
					</Tabs>
				</section>
				<section className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">Dialog</h3>
					<Dialog>
						<DialogContent size="sm">
							<DialogHeader>
								<DialogTitle>Small dialog</DialogTitle>
								<DialogDescription>600px → max-w-dialog-sm</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				</section>
			</div>
		);
	}
	const members = Object.keys(preset.components).filter((n) => COMPONENT_GROUP[n] === selection);
	return (
		<div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
			{members.sort().map((name) => (
				<section key={name} className="preset-canvas p-4">
					<h3 className="mb-2 text-sm font-semibold">{name}</h3>
					<ComponentPreview name={name} />
				</section>
			))}
		</div>
	);
}

/** Minimal per-component preview; extend with representative variants as needed. */
function ComponentPreview({ name }: { name: string }) {
	switch (name) {
		case "button":
			return <DemoButtonRow />;
		case "input":
		case "textarea":
		case "select":
			return <DemoFormRow />;
		case "card":
			return <DemoCardRow />;
		case "table":
			return <DemoDataRow />;
		case "badge":
			return <Badge>Badge</Badge>;
		default:
			return <p className="text-xs text-muted-foreground">{name} — preview not yet added</p>;
	}
}
```

> `DialogContent` needs a `size` prop — the core plan's codemod adds it. Until adoption runs, pass `className="max-w-dialog-sm"` instead; Task 6 of this plan runs `preset:codemod` and then the `size` prop exists. Note the import paths: components export from `../../components/<name>/<name>` — verify each export name (`Card.Header` etc.) against the component's actual API and adjust.

- [ ] **Step 2: Create the colors TokenPanel**

Create `src/preset/components/TokenPanel.tsx` — the full light/dark color pickers (shown at the bottom when no component is focused; the non-color GENERAL fields live in the left rail):

```tsx
import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset } from "../../../scripts/types";

export function TokenPanel() {
	const preset = useStore(workingPreset);
	if (!preset) return null;

	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(preset);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}

	const section = (theme: "light" | "dark") => (
		<section>
			<h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
				Colors — {theme}
			</h4>
			{Object.entries(preset.colors[theme]).map(([key, value]) => (
				<label key={key} className="preset-row" style={{ gridTemplateColumns: "11rem 8rem" }}>
					<span>{key}</span>
					<input
						type="color"
						className="h-7 w-10 cursor-pointer rounded-sm border border-input"
						value={toHex(value)}
						onChange={(e) =>
							patch((p) => {
								// Defect-9 fix: NEVER write a hex back into preset.json — the preset
								// stores oklch verbatim. The input shows a derived hex; on change the
								// picked hex is converted -> oklch so the stored value round-trips.
								p.colors[theme][key] = toOklch(e.target.value);
							})
						}
					/>
				</label>
			))}
		</section>
	);

	return (
		<div className="max-h-72 overflow-y-auto border-t border-border bg-background">
			<div className="flex flex-wrap gap-6 p-3">
				{section("light")}
				{section("dark")}
			</div>
		</div>
	);
}

/** color input needs hex; derive a best-effort hex from any stored color (oklch/rgb). */
export function toHex(value: string): string {
	if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
	try {
		const m = /^oklch\(([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/.exec(value);
		if (m) {
			// Defect-11 fix: CSS oklch components are 0–1 UNLESS they carry a `%` sign.
			// The old `parseFloat / 100` unconditionally shrank unitless values, so
			// `oklch(1 0 0)` (white) rendered as l=0.01 → a near-black swatch. Normalize
			// only the 0–100 percentage form; unitless 0–1 is used directly.
			const to01 = (s: string) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));
			const l = to01(m[1]);
			const c = to01(m[2]);
			const h = (parseFloat(m[3]) * Math.PI) / 180;
			return rgbToHex(oklchToSrgb(l, c, h));
		}
		const rgb = /^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value);
		if (rgb) {
			const [r, g, b] = [1, 2, 3].map((i) => parseFloat(rgb[i]) / 255);
			return rgbToHex({ r, g, b });
		}
	} catch {
		/* fall through */
	}
	return "#808080"; // unparseable — mid gray swatch; the stored value is untouched
}

/** oklab -> linear sRGB (CSS Color 4 matrices), then to sRGB for the swatch. */
function oklchToSrgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;
	const lr = l_ ** 3, mr = m_ ** 3, sr = s_ ** 3;
	const r = 4.0767416621 * lr - 3.3077115913 * mr + 0.2309699292 * sr;
	const g = -1.2684380046 * lr + 2.6097574011 * mr - 0.3413193965 * sr;
	const bl = -0.0041960863 * lr - 0.7034186147 * mr + 1.707614701 * sr;
	const d = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
	return { r: d(r), g: d(g), b: d(bl) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
	const to255 = (v: number) => Math.round(Math.min(255, Math.max(0, v * 255)));
	return `#${[r, g, b].map((v) => to255(v).toString(16).padStart(2, "0")).join("")}`;
}

/** hex -> oklch string, written back into the preset so it stays oklch (defect-9). */
function toOklch(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	const o = srgbToOklch(r, g, b);
	return `oklch(${o.l.toFixed(3)} ${o.c.toFixed(3)} ${o.h.toFixed(2)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.slice(1), 16);
	return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

/** linear sRGB -> oklab -> oklch (CSS Color 4 matrices). */
function srgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
	const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	const rl = lin(r), gl = lin(g), bl = lin(b);
	const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
	const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
	const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
	const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	const C = Math.hypot(A, B);
	const H = (Math.atan2(B, A) * 180) / Math.PI;
	return { l: L, c: C, h: (H + 360) % 360 };
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @repo/shared-ui typecheck`
Expected: clean (after fixing any export-name mismatches in `Gallery.tsx` — align imports with the real component APIs).

- [ ] **Step 4: Commit**

```bash
git add src/preset/components/Gallery.tsx src/preset/components/TokenPanel.tsx
git commit -m "feat(shared-ui): add preset gallery and token editors"
```

---

## Task 5: SpecPanel + Row (per-component spec sheet)

**Files:**
- Create: `packages/shared-ui/src/preset/components/SpecPanel.tsx`
- Create: `packages/shared-ui/src/preset/components/Row.tsx`

- [ ] **Step 1: Create the Row**

Create `src/preset/components/Row.tsx`:

```tsx
import { convertValue, type ValueKind } from "../../../scripts/conversion";

export function Row({
	label,
	value,
	mode,
	kind,
	onValue,
	onToggleMode,
	onInherit,
}: {
	label: string;
	value: string;
	mode: "convert" | "as-is";
	kind: ValueKind;
	onValue: (v: string) => void;
	onToggleMode: () => void;
	onInherit?: () => void;
}) {
	const resolved = convertValue(value, kind, mode);
	return (
		<div className="preset-row">
			<span className="font-medium">{label}</span>
			<input className="preset-input" value={value} onChange={(e) => onValue(e.target.value)} />
			{onInherit ? (
				<button
					className="preset-toggle"
					onClick={onInherit}
					title="stop overriding; inherit from GENERAL"
				>
					↺ inherit
				</button>
			) : (
				<button
					className="preset-toggle"
					data-active={mode === "as-is"}
					onClick={onToggleMode}
					title="convert snaps to the nearest Tailwind step; as-is keeps the literal value"
				>
					{mode === "convert" ? "Convert" : "Keep as-is"}
				</button>
			)}
			<span className="truncate text-xs text-muted-foreground" title={resolved.display}>
				{resolved.display}
			</span>
			<span className="text-xs">{resolved.snapped ? "⚡" : "🔒"}</span>
		</div>
	);
}
```

- [ ] **Step 2: Create the SpecPanel**

Create `src/preset/components/SpecPanel.tsx` — edits ONLY the selected component's own entry (`radius` + `sizes`); it never touches siblings (defect-6: per-component override). The header shows the resolved three-tier source: component override → group override → GENERAL base:

```tsx
import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset, RadiusOverride } from "../../../scripts/types";
import { COMPONENT_GROUP } from "../groups";
import { Row } from "./Row";

type CompEntry = Preset["components"][string] & {
	radius?: { value: string; mode: "convert" | "as-is" } | { shift: string };
	sizes?: Record<string, { width?: { value: string; mode: "convert" | "as-is" } }>;
};

export function SpecPanel({ componentName }: { componentName: string }) {
	const preset = useStore(workingPreset);
	if (!preset) return null;
	const group = COMPONENT_GROUP[componentName] ?? "surface";
	const entry = preset.components[componentName] as CompEntry | undefined;
	const compRadius = entry?.radius;
	const groupRadius = preset.radiusGroups[group] as RadiusOverride | undefined;

	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(preset);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}

	function ensureEntry() {
		if (!preset.components[componentName]) {
			patch((p) => {
				(p.components[componentName] as Record<string, unknown>) = { group };
			});
		}
	}

	// three-tier resolution: component radius wins, else group radius, else GENERAL base
	const source =
		compRadius !== undefined ? "component" :
		groupRadius != null ? "group" :
		"general";

	return (
		<div className="max-h-72 overflow-y-auto border-t border-border bg-background">
			<div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				<span>{componentName} · group: {group}</span>
				{source === "component" && <span className="text-primary">● component override</span>}
				{source === "group" && <span className="text-primary">● group override</span>}
				{source === "general" && <span>↺ inherits GENERAL radius</span>}
				{!entry && <span> · not yet adopted — inherits group defaults</span>}
			</div>

			{/* radius — the selected component's OWN override (or inherit). Editing here
			    only writes components.<name>.radius — sibling components are untouched. */}
			{compRadius && "value" in compRadius ? (
				<Row
					label="radius (own override)"
					value={compRadius.value}
					mode={compRadius.mode}
					kind="radius"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: v, mode: compRadius.mode }))}
					onToggleMode={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: compRadius.value, mode: compRadius.mode === "convert" ? "as-is" : "convert" }))}
					onInherit={() => patch((p) => void delete (p.components[componentName] as CompEntry).radius)}
				/>
			) : compRadius && "shift" in compRadius ? (
				<Row
					label="radius (own shift)"
					value={compRadius.shift}
					mode="as-is"
					kind="radius"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { shift: v }))}
					onInherit={() => patch((p) => void delete (p.components[componentName] as CompEntry).radius)}
				/>
			) : (
				<div className="preset-row">
					<span className="font-medium">radius</span>
					<span className="text-xs text-muted-foreground">
						{source === "group"
							? `inherits group ${group} (${"value" in groupRadius! ? groupRadius.value.value : "base + " + groupRadius!.shift})`
							: `inherits GENERAL base (${preset.radius.base.value})`}
					</span>
					<button className="preset-toggle" onClick={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: preset.radius.base.value, mode: "convert" }))}>
						✎ set own value (component override)
					</button>
					<button className="preset-toggle" onClick={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { shift: "2px" }))}>
						✎ shift from base
					</button>
				</div>
			)}

			{Object.entries(entry?.sizes ?? {}).map(([sizeKey, size]) => (
				<Row
					key={sizeKey}
					label={`size.${sizeKey} · width`}
					value={size.width?.value ?? "600px"}
					mode={size.width?.mode ?? "convert"}
					kind="width"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).sizes![sizeKey] = { width: { value: v, mode: size.width?.mode ?? "convert" } }))}
					onToggleMode={() =>
						ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).sizes![sizeKey] = { width: { value: size.width?.value ?? "600px", mode: size.width?.mode === "convert" ? "as-is" : "convert" } }))
					}
				/>
			))}
			{!entry?.sizes && (
				<button
					className="preset-toggle m-3"
					onClick={() =>
						ensureEntry() && patch((p) => {
							(p.components[componentName] as CompEntry).sizes = { sm: { width: { value: "600px", mode: "convert" } } };
						})
					}
				>
					+ add size variant
				</button>
			)}
		</div>
	);
}
```

> `as CompEntry` keeps the editor code terse; the save endpoint re-validates with zod, so a malformed shape is caught server-side.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @repo/shared-ui typecheck`
Expected: clean.

- [ ] **Step 4: Manual verification of the full loop**

Run: `pnpm --filter @repo/shared-ui preset`
In the browser:
1. Edit `fonts.body` or the **radius base** in the left GENERAL rail → the gallery updates instantly (Buttons, Inputs, Card all inherit).
2. Click **dialog** in the right sidebar → bottom panel edits DIALOG ONLY (its own `radius`/`size.lg · width`). Change `size.lg · width` to `1000` → resolved preview shows the snap (`max-w-6xl`, Δ) or `Keep as-is` → literal.
3. On `button`, hit **✎ set own value** → it becomes a COMPONENT override (`●` appears next to `button` in the right rail, siblings untouched); toggle back with **↺ inherit** → `●` disappears. Verify `input` (same group) is unchanged.
4. Click **Save** → report line shows "N components rewritten".
5. Check `git diff src/styles/global.css` → `--container-dialog-lg` reflects the new width; `--radius-button` appears only when button opts out (component-level `--radius-dialog` likewise only for dialog).
6. Toggle `◐ dark` → gallery re-renders with dark vars.
7. Click **↺ reset** → values revert to disk state.

- [ ] **Step 5: Commit**

```bash
git add src/preset/components/SpecPanel.tsx src/preset/components/Row.tsx
git commit -m "feat(shared-ui): add preset spec sheet editor"
```

---

## Task 6: Adoption wiring + security review + docs

**Files:**
- Modify: `packages/shared-ui/README.md` (and `templates/shared-ui/README.md` if synced)
- None else

- [ ] **Step 1: Run the adoption codemod (if not already done in the core plan)**

Run: `pnpm --filter @repo/shared-ui preset:codemod`
Expected: all 44 css.ts tokenized (48 component dirs exist; `carousel`, `chart`, `spinner`, `squircle` ship no css.ts and are skipped by the codemod); `git diff --stat` shows the component changes. Confirm `dialog.css.ts` now has the `size` variant (used by `Gallery.tsx`'s `<DialogContent size="sm">`).

- [ ] **Step 2: Verify Storybook regression**

Run: `pnpm --filter @repo/shared-ui storybook`
Expected: all components render with default theme, no visual regression (default preset mirrors prior values).

- [ ] **Step 3: Security review of the save API**

Dispatch **security-auditor-agent** on `scripts/server.ts` + `vite.preset.config.ts` + `scripts/pipeline.ts`. Review focus:
- The POST endpoint writes `preset.json` + rewrites `src/**` files from a browser request — confirm it is dev-only (never mounted in the published package/build) and document that it must never be enabled in production.
- zod schema prevents arbitrary shapes; confirm no path traversal (paths are constants, not derived from input).
- `.backup/` snapshot is taken before writes.

Expected output: findings list + all-clear or fixes. Apply any fixes in a new commit.

- [ ] **Step 4: Document the workflow**

Update `packages/shared-ui/README.md` with the "Design Preset" section:

```markdown
## Design Preset

The design (colors, typography, fonts, radius base + per-group opt-outs + per-component overrides, spacing,
shadows, breakpoints, animations) is driven by a single source of truth: `src/theme/preset.json`. Components
reference semantic tokens (`rounded`, `rounded-<group>`, `rounded-<component>`, `text-body`,
`max-w-dialog-lg`) whose values live in the generated `src/styles/colors.css` + `src/styles/global.css`.

### Workflow — match a client's Figma

1. `pnpm preset:codemod` — one-time: tokenizes all components (safe to re-run; adopts new components too).
2. `pnpm preset` — opens the design dashboard (like Storybook). Edit the left **GENERAL** rail once (fonts,
   radius base, type scale, colors…); the gallery previews in real time. Per component, the bottom spec
   sheet lets you **inherit** the radius (GENERAL base → group → component) or **✎ create an override**
   (value or base+shift) on the selected component only — siblings are never touched.
   - Every value has **Convert** (snap to nearest Tailwind step) or **Keep as-is** (literal, pixel-perfect).
3. **Save** — snapshots the current theme files (incl. every `*.css.ts`) FIRST, then writes `preset.json`,
   rewrites the changed `*.css.ts` and regenerates the theme CSS; on failure everything is rolled back.

### Scripts

| Script | Purpose |
|---|---|
| `pnpm preset` | Open the design dashboard |
| `pnpm preset:build` | Headless: regenerate theme CSS from `preset.json` (CI) |
| `pnpm preset:codemod` | Tokenize components / adopt new ones (prints report) |
| `pnpm preset:check` | Guard: warns on untokenized classes; `--strict` fails (CI) |
| `pnpm preset:reset` | Restore from `src/theme/.backup/` |

The dashboard (`src/preset/**`) is DEV-ONLY: it is excluded from the published package, never mounted in
production (the save API rewrites theme files from a browser request), and the scaffolding scripts
(`builder/shared-ui.sh`) skip `src/preset/**` so a re-scaffold never deletes it.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(shared-ui): document the design preset workflow"
```

---

## Task 7: Scaffolding exclusion + CI wiring + final verification

**Files:**
- Modify: `builder/shared-ui.sh` (skip `src/preset/**`)
- Modify: `.moon/tasks/all.yml` (add `preset:check --strict` to the shared-ui gate)
- None else

- [ ] **Step 1: Make the scaffold skip the dashboard (template rule)**

The builder renames every `*.tsx` under `src/` to `*.raw.tsx` — that would turn `src/preset/main.tsx` into a raw file and break the dashboard. Patch the copy/rename loop to skip `src/preset/**` and `src/theme/.backup/`:

```bash
# in builder/shared-ui.sh, inside the rename loop:
case "$file" in
	src/preset/* | src/theme/.backup/*) continue ;; # dashboard + backups are authored, not scaffolded
esac
```

Expected: re-running the scaffold leaves `src/preset/**` untouched; the dashboard still boots.

- [ ] **Step 2: Wire `preset:check --strict` into the CI gate**

Add `preset:check --strict` to the shared-ui moon task graph (the repo has no `.gitlab-ci.yml`; `.github/workflows/{cleanup,release}.yml` delegate to moon). Expected: a temporary `bg-red-500` in any css.ts fails the gate; removing it passes. Commit the wiring.

- [ ] **Step 3: Full check suite**

Run: `pnpm --filter @repo/shared-ui typecheck && pnpm --filter @repo/shared-ui lint && pnpm --filter @repo/shared-ui test && pnpm --filter @repo/shared-ui preset:check`
Expected: all clean.

- [ ] **Step 4: End-to-end smoke**

Run: `pnpm --filter @repo/shared-ui preset` → edit → save → `git diff --stat` shows only intended files. Open Storybook → all good. Re-run `preset:build` → no diff (idempotent). Kill the dashboard mid-save (or point the save at a bad value) → the rollback restores the previous theme files.

- [ ] **Step 5: Commit any final fixes**

```bash
git add builder/shared-ui.sh .moon/ && git commit -m "chore(shared-ui): exclude preset dashboard from scaffold, wire preset:check into CI"
git add -A && git commit -m "chore(shared-ui): final preset dashboard fixes"
```

---

## Plan self-review (done by the author — verified against spec §7–§10)

- **Spec coverage:** §7 dashboard (left GENERAL rail, right component list with per-component `●` override markers, gallery, reactive preview, three-tier spec sheet with component > group > base inherit/override, new-component notice) → Tasks 2–5; §8 `preset` script + middleware → Tasks 1 & 3 Step 6; §6 save pipeline (snapshot → resolve → codemod → codegen → write, rollback on failure) wired to Save → Task 1 (server) + App.tsx; §10 workflow steps 4–7 → README (Task 6) + Task 5 Step 4 manual loop; §11 dashboard testing → preview.test.ts + manual verification steps; §12 risks (var-reactivity fallback) → core plan Task 1 spike gates `preview.ts`; security → Task 6 Step 3; scaffold exclusion + CI wiring → Task 7 Steps 1–2.
- **Placeholder scan:** no TBD/TODO; `ComponentPreview` has a `default` branch that is an intentional, explicit placeholder with a message (new components get a visible "preview not yet added" state rather than a crash); all code steps complete.
- **Type consistency:** `buildPreviewCss(preset, specs, theme)` signature matches test + App call sites; `Row` props (`value`, `mode`, `kind`, `onValue`, `onToggleMode`, optional `onInherit`) used consistently in `SpecPanel`; `fetchPreset`/`savePreset` return shapes match `server.ts` responses; `DialogContent size` prop depends on core plan Task 6 (adoption) — explicitly called out in Task 6 Step 1 and Task 4 Step 1 note; radius resolution uses the three-tier `RadiusOverride` union (absent → inherit, `{value, mode}`, `{shift, mode}`) from core plan types via `components.*.radius` + `radiusGroups`; the preview builder mirrors codegen per-mode so preview == saved output.
