# Shared UI Preset Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local dev-only Vite SPA (`packages/preset-engine`) that lets developers visually edit design tokens (colors, fonts, radius, spacing, shadows, breakpoints) and save them to shared-ui's CSS files — like shadcn/create but integrated into the monorepo workflow.

**Architecture:** A React 19 + Vite 8 SPA — like `ui.shadcn.com/create`. Left sidebar has all customization controls (colors, fonts, radius, spacing editors). Center canvas is a **LIVE COMPONENT GALLERY** showing real shared-ui components reacting to token edits instantly. Right panel shows current token state. Reads `colors.css` + `global.css` from `packages/shared-ui/src/styles/` on load, writes back on save. CSS files ARE the persistent state — no separate preset.json. Seamless handoff: Engineer A saves → files update → Engineer B opens → reads the same files.

**Tech Stack:** React 19, Vite 8, Tailwind v4, nanostores, zod, TypeScript ~6.0.2, oxlint, oxfmt

**Spec:** `docs/superpowers/specs/2026-08-08-preset-engine-design.md`

---

## File Structure

```
packages/preset-engine/
├── package.json                     # CREATE — package config
├── tsconfig.json                    # CREATE — TypeScript config
├── vite.config.ts                   # CREATE — Vite dev server + API middleware
├── src/
│   ├── index.html                   # CREATE — entry HTML
│   ├── main.tsx                     # CREATE — React root
│   ├── App.tsx                      # CREATE — main layout
│   ├── api.ts                       # CREATE — fetch wrappers for /api/*
│   ├── store.ts                     # CREATE — nanostores for token state
│   ├── engine/
│   │   ├── tokens.ts                # CREATE — token schema + types (zod)
│   │   ├── scales.ts                # CREATE — Tailwind v4 scale tables
│   │   ├── generate.ts              # CREATE — token values → CSS strings
│   │   ├── parse.ts                 # CREATE — CSS strings → token values
│   │   └── codemod.ts               # CREATE — rewrite *.css.ts files
│   ├── components/
│   │   ├── TokenEditor.tsx          # CREATE — per-category token editor
│   │   ├── ColorPicker.tsx          # CREATE — OKLCH color picker
│   │   ├── Gallery.tsx              # CREATE — live component gallery
│   │   ├── Toolbar.tsx              # CREATE — save/reset/theme toggle
│   │   ├── Sidebar.tsx              # CREATE — category navigation
│   │   └── RadiusPreview.tsx        # CREATE — visual radius scale preview
│   └── styles/
│       └── dashboard.css            # CREATE — dashboard-specific styles
├── tests/
│   ├── generate.test.ts             # CREATE
│   ├── parse.test.ts                # CREATE
│   ├── codemod.test.ts              # CREATE
│   └── fixtures/
│       ├── colors.css.golden        # CREATE — copy of current colors.css
│       └── global.css.golden        # CREATE — copy of current global.css
└── vitest.config.ts                 # CREATE
```

---

## Task 0: Scaffold the package + Vite config

**Files:**
- Create: `packages/preset-engine/package.json`
- Create: `packages/preset-engine/tsconfig.json`
- Create: `packages/preset-engine/vite.config.ts`
- Create: `packages/preset-engine/src/index.html`
- Create: `packages/preset-engine/src/main.tsx`
- Create: `packages/preset-engine/src/App.tsx`
- Modify: `packages/preset-engine/pnpm-workspace.yaml` (add to workspace)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/preset-engine",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "oxlint --fix .",
    "check": "oxlint --fix . && oxfmt .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@repo/shared-ui": "workspace:*",
    "nanostores": "^1.2.0",
    "@nanostores/react": "^1.1.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.2",
    "typescript": "catalog:",
    "vite": "~8.0.3",
    "vitest": "^4.1.2",
    "oxlint": "catalog:",
    "oxfmt": "catalog:"
  },
  "peerDependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function presetServer(): Plugin {
  return {
    name: "preset-engine-server",
    configureServer(server) {
      // API: read current CSS files
      server.middlewares.use("/api/tokens", async (req, res) => {
        if (req.method === "GET") {
          try {
            const sharedUiRoot = resolve(__dirname, "../../shared-ui/src/styles");
            const { readFileSync } = await import("node:fs");
            const colors = readFileSync(resolve(sharedUiRoot, "colors.css"), "utf8");
            const global = readFileSync(resolve(sharedUiRoot, "global.css"), "utf8");
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, colors, global }));
          } catch (e) {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          }
          return;
        }
        res.statusCode = 405;
        res.end();
      });

      // API: save CSS files + run codemod
      server.middlewares.use("/api/save", async (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", async () => {
            try {
              const { colors, global } = JSON.parse(body);
              const { writeFileSync } = await import("node:fs");
              const sharedUiRoot = resolve(__dirname, "../../shared-ui/src/styles");
              writeFileSync(resolve(sharedUiRoot, "colors.css"), colors, "utf8");
              writeFileSync(resolve(sharedUiRoot, "global.css"), global, "utf8");
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: false, error: String(e) }));
            }
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
  plugins: [react(), tailwindcss(), presetServer()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: { port: 6100, host: false, open: true },
});
```

- [ ] **Step 4: Create entry files**

Create `src/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shared UI — Preset Engine</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/dashboard.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `src/App.tsx`:
```tsx
export function App() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-10 items-center gap-3 border-b border-border px-4">
        <span className="text-sm font-bold">Preset Engine</span>
        <span className="text-xs text-muted-foreground">— shared-ui design tokens</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-border bg-muted p-2">
          <p className="text-xs text-muted-foreground">Sidebar</p>
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground">Canvas</p>
        </main>
        <aside className="w-64 shrink-0 border-l border-border bg-muted p-3">
          <p className="text-xs text-muted-foreground">State panel</p>
        </aside>
      </div>
    </div>
  );
}
```

Create `src/styles/dashboard.css`:
```css
@import "tailwindcss";
```

- [ ] **Step 5: Add to pnpm workspace**

In `monorepo/pnpm-workspace.yaml`, add `- packages/preset-engine` to the packages list.

- [ ] **Step 6: Install dependencies**

Run: `pnpm install` from monorepo root.
Expected: install completes, `@repo/preset-engine` appears in workspace.

- [ ] **Step 7: Verify dev server starts**

Run: `cd packages/preset-engine && pnpm dev`
Expected: Vite dev server starts on port 6100, opens browser showing "Preset Engine" heading.

- [ ] **Step 8: Verify typecheck**

Run: `pnpm --filter @repo/preset-engine typecheck`
Expected: clean (no errors).

- [ ] **Step 9: Commit**

```bash
git add packages/preset-engine/
git commit -m "feat(preset-engine): scaffold package with Vite dev server"
```

---

## Task 1: Token schema + CSS parser

**Files:**
- Create: `packages/preset-engine/src/engine/tokens.ts`
- Create: `packages/preset-engine/src/engine/parse.ts`
- Create: `packages/preset-engine/tests/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/parse.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseColorsCss, parseGlobalCss } from "../src/engine/parse";

const SAMPLE_COLORS = `@layer utilities {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.25 0.008 255.21);
    --primary: oklch(0.55 0.191 263.8);

    &:where([data-theme="dark"], [data-theme="dark"] *) {
      --background: oklch(0.15 0.011 252.11);
      --foreground: oklch(0.98 0.003 252.11);
      --primary: oklch(0.679 0.211 263.8);
    }
  }
}`;

const SAMPLE_GLOBAL = `@import "tailwindcss";

@theme {
  --color-background: var(--background);
  --color-primary: var(--primary);
  --radius: 0.6rem;
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --spacing: 0.25rem;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --sidebar-width: 16rem;
}`;

describe("parseColorsCss", () => {
  it("extracts light color tokens", () => {
    const result = parseColorsCss(SAMPLE_COLORS);
    expect(result.light.background).toBe("oklch(1 0 0)");
    expect(result.light.primary).toBe("oklch(0.55 0.191 263.8)");
  });

  it("extracts dark color tokens", () => {
    const result = parseColorsCss(SAMPLE_COLORS);
    expect(result.dark.background).toBe("oklch(0.15 0.011 252.11)");
    expect(result.dark.primary).toBe("oklch(0.679 0.211 263.8)");
  });
});

describe("parseGlobalCss", () => {
  it("extracts theme tokens", () => {
    const result = parseGlobalCss(SAMPLE_GLOBAL);
    expect(result.radius).toBe("0.6rem");
    expect(result.spacing).toBe("0.25rem");
    expect(result.fontSans).toContain("Inter");
    expect(result.fontMono).toContain("JetBrains Mono");
  });

  it("extracts sidebar width", () => {
    const result = parseGlobalCss(SAMPLE_GLOBAL);
    expect(result.sidebarWidth).toBe("16rem");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/preset-engine test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the token schema**

Create `src/engine/tokens.ts`:
```ts
import { z } from "zod";

export const colorTokensSchema = z.record(z.string());
export type ColorTokens = z.infer<typeof colorTokensSchema>;

export const tokensSchema = z.object({
  light: colorTokensSchema,
  dark: colorTokensSchema,
});

export const globalTokensSchema = z.object({
  radius: z.string(),
  spacing: z.string(),
  fontSans: z.string(),
  fontMono: z.string(),
  sidebarWidth: z.string(),
  sidebarWidthMobile: z.string().optional(),
  sidebarWidthIcon: z.string().optional(),
});

export type GlobalTokens = z.infer<typeof globalTokensSchema>;

export interface ParsedTokens {
  colors: { light: ColorTokens; dark: ColorTokens };
  global: GlobalTokens;
}
```

- [ ] **Step 4: Create the CSS parser**

Create `src/engine/parse.ts`:
```ts
import type { ColorTokens, GlobalTokens } from "./tokens";

/**
 * Parse colors.css to extract light and dark color token maps.
 * Expects the format: @layer utilities { :root { --token: value; &:where([data-theme="dark"] ...) { --token: value; } } }
 */
export function parseColorsCss(css: string): { light: ColorTokens; dark: ColorTokens } {
  const light: ColorTokens = {};
  const dark: ColorTokens = {};

  // Find :root block
  const rootMatch = css.match(/:root\s*\{/);
  if (!rootMatch) return { light, dark };

  const rootStart = rootMatch.index!;
  const rootContent = extractBlock(css, rootStart);

  // Parse light tokens (before dark block)
  const darkBlockMatch = rootContent.match(/&:where\(\[data-theme="dark"\]/);
  const lightSection = darkBlockMatch
    ? rootContent.slice(0, darkBlockMatch.index!)
    : rootContent;

  for (const match of lightSection.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g)) {
    light[match[1]] = match[2].trim();
  }

  // Parse dark tokens (inside dark block)
  if (darkBlockMatch) {
    const darkStart = darkBlockMatch.index!;
    const darkSection = rootContent.slice(darkStart);
    for (const match of darkSection.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g)) {
      dark[match[1]] = match[2].trim();
    }
  }

  return { light, dark };
}

/**
 * Parse global.css to extract theme configuration values.
 */
export function parseGlobalCss(css: string): GlobalTokens {
  const get = (key: string): string => {
    const match = css.match(new RegExp(`--${key}:\\s*([^;]+);`));
    return match?.[1]?.trim() ?? "";
  };

  return {
    radius: get("radius"),
    spacing: get("spacing"),
    fontSans: get("font-sans"),
    fontMono: get("font-mono"),
    sidebarWidth: get("sidebar-width"),
    sidebarWidthMobile: get("sidebar-width-mobile"),
    sidebarWidthIcon: get("sidebar-width-icon"),
  };
}

/**
 * Extract the content of a CSS block starting at the given position.
 * Handles nested braces.
 */
function extractBlock(css: string, startIndex: number): string {
  const openBrace = css.indexOf("{", startIndex);
  if (openBrace === -1) return "";

  let depth = 0;
  let i = openBrace;
  while (i < css.length) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(openBrace + 1, i);
    }
    i++;
  }
  return css.slice(openBrace + 1);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/preset-engine test`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/preset-engine/src/engine/ packages/preset-engine/tests/
git commit -m "feat(preset-engine): add token schema and CSS parser"
```

---

## Task 2: CSS generation engine

**Files:**
- Create: `packages/preset-engine/src/engine/generate.ts`
- Create: `packages/preset-engine/src/engine/scales.ts`
- Create: `packages/preset-engine/tests/generate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generateColorsCss, generateGlobalCss } from "../src/engine/generate";
import type { ColorTokens, GlobalTokens } from "../src/engine/tokens";

const LIGHT: ColorTokens = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.25 0.008 255.21)",
  primary: "oklch(0.55 0.191 263.8)",
};

const DARK: ColorTokens = {
  background: "oklch(0.15 0.011 252.11)",
  foreground: "oklch(0.98 0.003 252.11)",
  primary: "oklch(0.679 0.211 263.8)",
};

const GLOBAL: GlobalTokens = {
  radius: "0.6rem",
  spacing: "0.25rem",
  fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
  sidebarWidth: "16rem",
};

describe("generateColorsCss", () => {
  it("emits light tokens in :root", () => {
    const css = generateColorsCss(LIGHT, DARK);
    expect(css).toContain("--background: oklch(1 0 0)");
    expect(css).toContain("--primary: oklch(0.55 0.191 263.8)");
  });

  it("emits dark tokens nested inside :root", () => {
    const css = generateColorsCss(LIGHT, DARK);
    const rootStart = css.indexOf(":root {");
    const darkBlock = css.indexOf('[data-theme="dark"]', rootStart);
    expect(darkBlock).toBeGreaterThan(rootStart);
    expect(css).toContain("--background: oklch(0.15 0.011 252.11)");
  });

  it("wraps in @layer utilities", () => {
    const css = generateColorsCss(LIGHT, DARK);
    expect(css).toMatch(/^@layer utilities/);
  });
});

describe("generateGlobalCss", () => {
  it("emits @theme block with color mappings", () => {
    const css = generateGlobalCss(GLOBAL);
    expect(css).toContain("@theme {");
    expect(css).toContain("--color-background: var(--background)");
  });

  it("emits radius scale", () => {
    const css = generateGlobalCss(GLOBAL);
    expect(css).toContain("--radius: 0.6rem");
    expect(css).toContain("--radius-lg: var(--radius)");
  });

  it("emits font families", () => {
    const css = generateGlobalCss(GLOBAL);
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-mono:");
  });

  it("emits static wrapper (base layer + keyframes)", () => {
    const css = generateGlobalCss(GLOBAL);
    expect(css).toContain("@layer base");
    expect(css).toContain("@keyframes accordion-down");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/preset-engine test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the scale tables**

Create `src/engine/scales.ts`:
```ts
/**
 * Tailwind v4 default radius scale, derived from --radius base.
 * The multiplier approach matches shadcn's model.
 */
export const RADIUS_MULTIPLIERS: Record<string, number> = {
  sm: 0.6,
  md: 0.8,
  lg: 1,    // base
  xl: 1.4,
  "2xl": 1.8,
  "3xl": 2.2,
  "4xl": 2.6,
};
```

- [ ] **Step 4: Create the CSS generator**

Create `src/engine/generate.ts`:
```ts
import type { ColorTokens, GlobalTokens } from "./tokens";
import { RADIUS_MULTIPLIERS } from "./scales";

/**
 * Generate colors.css from light and dark token maps.
 * Matches the current shared-ui format: @layer utilities > :root > nested dark block.
 */
export function generateColorsCss(light: ColorTokens, dark: ColorTokens): string {
  const lightVars = Object.entries(light)
    .map(([k, v]) => `\t\t--${k}: ${v};`)
    .join("\n");

  const darkVars = Object.entries(dark)
    .map(([k, v]) => `\t\t\t--${k}: ${v};`)
    .join("\n");

  return `@layer utilities {
\t:root {
${lightVars}

\t\t&:where([data-theme="dark"], [data-theme="dark"] *) {
${darkVars}
\t\t}
\t}
}
`;
}

/**
 * Generate global.css from global token values.
 * Produces the @theme block + static wrapper (base layer, keyframes).
 */
export function generateGlobalCss(global: GlobalTokens): string {
  const radiusVars = Object.entries(RADIUS_MULTIPLIERS)
    .map(([k, m]) => {
      if (k === "lg") return `\t--radius-${k}: var(--radius);`;
      const calc = m < 1
        ? `calc(var(--radius) * ${m})`
        : `calc(var(--radius) * ${m})`;
      return `\t--radius-${k}: ${calc};`;
    })
    .join("\n");

  return `@import "tailwindcss";

@theme {
\t/* Base Colors */
\t--color-background: var(--background);
\t--color-foreground: var(--foreground);
\t--color-primary: var(--primary);
\t--color-primary-foreground: var(--primary-foreground);
\t--color-secondary: var(--secondary);
\t--color-secondary-foreground: var(--secondary-foreground);
\t--color-destructive: var(--destructive);
\t--color-destructive-foreground: var(--destructive-foreground);

\t/* Component Colors */
\t--color-card: var(--card);
\t--color-card-foreground: var(--card-foreground);
\t--color-popover: var(--popover);
\t--color-popover-foreground: var(--popover-foreground);
\t--color-muted: var(--muted);
\t--color-muted-foreground: var(--muted-foreground);
\t--color-accent: var(--accent);
\t--color-accent-foreground: var(--accent-foreground);

\t/* Border & Input */
\t--color-border: var(--border);
\t--color-input: var(--input);
\t--color-ring: var(--ring);

\t/* Chart Colors */
\t--color-chart-1: var(--chart-1);
\t--color-chart-2: var(--chart-2);
\t--color-chart-3: var(--chart-3);
\t--color-chart-4: var(--chart-4);
\t--color-chart-5: var(--chart-5);

\t/* Sidebar Colors */
\t--color-sidebar: var(--sidebar-background);
\t--color-sidebar-foreground: var(--sidebar-foreground);
\t--color-sidebar-primary: var(--sidebar-primary);
\t--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
\t--color-sidebar-accent: var(--sidebar-accent);
\t--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
\t--color-sidebar-border: var(--sidebar-border);
\t--color-sidebar-ring: var(--sidebar-ring);

\t/* Status Colors */
\t--color-success: var(--success);
\t--color-success-foreground: var(--success-foreground);
\t--color-info: var(--info);
\t--color-info-foreground: var(--info-foreground);
\t--color-warning: var(--warning);
\t--color-warning-foreground: var(--warning-foreground);
\t--color-error: var(--error);
\t--color-error-foreground: var(--error-foreground);

\t/* Border Radius */
${radiusVars}

\t/* Spacing */
\t--spacing: ${global.spacing};

\t/* Sidebar Width */
\t--sidebar-width: ${global.sidebarWidth};
\t--sidebar-width-mobile: ${global.sidebarWidthMobile ?? "18rem"};
\t--sidebar-width-icon: ${global.sidebarWidthIcon ?? "3rem"};

\t/* Typography */
\t--font-sans: ${global.fontSans};
\t--font-mono: ${global.fontMono};

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
`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @repo/preset-engine test`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/preset-engine/src/engine/generate.ts packages/preset-engine/src/engine/scales.ts packages/preset-engine/tests/generate.test.ts
git commit -m "feat(preset-engine): add CSS generation engine"
```

---

## Task 3: API client + nanostores state

**Files:**
- Create: `packages/preset-engine/src/api.ts`
- Create: `packages/preset-engine/src/store.ts`

- [ ] **Step 1: Create the API client**

Create `src/api.ts`:
```ts
import type { ColorTokens, GlobalTokens } from "./engine/tokens";

export interface TokensResponse {
  ok: boolean;
  colors?: string;
  global?: string;
  error?: string;
}

export interface SaveResponse {
  ok: boolean;
  error?: string;
}

export async function fetchTokens(): Promise<TokensResponse> {
  const res = await fetch("/api/tokens");
  return res.json();
}

export async function saveTokens(
  colors: string,
  global: string,
): Promise<SaveResponse> {
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ colors, global }),
  });
  return res.json();
}
```

- [ ] **Step 2: Create the store**

Create `src/store.ts`:
```ts
import { atom } from "nanostores";
import type { ColorTokens, GlobalTokens } from "./engine/tokens";

export const lightColors = atom<ColorTokens>({});
export const darkColors = atom<ColorTokens>({});
export const globalTokens = atom<GlobalTokens>({
  radius: "0.6rem",
  spacing: "0.25rem",
  fontSans: "",
  fontMono: "",
  sidebarWidth: "16rem",
});
export const dirty = atom(false);
export const loading = atom(true);
export const saving = atom(false);

export function markDirty() {
  dirty.set(true);
}

export function markClean() {
  dirty.set(false);
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @repo/preset-engine typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/preset-engine/src/api.ts packages/preset-engine/src/store.ts
git commit -m "feat(preset-engine): add API client and nanostores state"
```

---

## Task 4: Dashboard shell — 3-column layout (shadcn/ui-style)

**Files:**
- Create: `packages/preset-engine/src/App.tsx` (rewrite)
- Create: `packages/preset-engine/src/components/Toolbar.tsx`
- Create: `packages/preset-engine/src/components/Sidebar.tsx`
- Create: `packages/preset-engine/src/components/StatePanel.tsx`
- Create: `packages/preset-engine/src/styles/dashboard.css` (rewrite)

**Left Sidebar sections:**
- Theme toggle (Light / Dark / System)
- Typography (font-sans, font-mono)
- Colors (24 tokens: primary, background, foreground, secondary, muted, accent, destructive, border, input, ring, card, popover, chart-1..5, sidebar-*)
- Radius (base value)
- Spacing (base, sidebar-width)
- Shadows (sm, md, lg)
- Breakpoints (sm, md, lg, xl, 2xl)

**Center Canvas sections:**
- Buttons (6 variants, 4 sizes, with icons)
- Inputs (text, email, file upload, checkbox, radio)
- Toggle (on/off)
- Select (dropdown)
- Slider (range)
- Cards (basic, with avatar)
- Badges (6 variants)
- Alert (warning)
- Dialog trigger
- Toast trigger

**Right Panel sections:**
- All color tokens (OKLCH values)
- All radius tokens (derived)
- Spacing + sidebar width
- Typography (font families)
- Shadows, breakpoints
- Token count + change count
- Dirty status
- Actions: Copy CSS, Export Preset

- [ ] **Step 1: Create the dashboard styles**

Rewrite `src/styles/dashboard.css`:
```css
@import "tailwindcss";

:root {
  color-scheme: light;
}

/* 3-column Variant B layout */
.preset-layout {
  display: grid;
  grid-template-columns: 14rem 1fr 18rem;
  grid-template-rows: 2.5rem 1fr;
  height: 100vh;
  overflow: hidden;
}

.preset-toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.preset-sidebar {
  grid-row: 2;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  background: var(--color-muted);
  padding: 0.5rem;
}

.preset-canvas {
  grid-row: 2;
  overflow-y: auto;
  padding: 1.5rem;
  background: var(--color-background);
}

.preset-panel {
  grid-row: 2;
  overflow-y: auto;
  border-left: 1px solid var(--color-border);
  background: var(--color-muted);
  padding: 0.75rem;
}

.preset-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
}
.preset-nav-item:hover {
  background: var(--color-accent);
}
.preset-nav-item[data-active="true"] {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.preset-section-label {
  padding: 0.5rem 0.625rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted-foreground);
}
```

- [ ] **Step 2: Create the toolbar**

Create `src/components/Toolbar.tsx`:
```tsx
import { useStore } from "@nanostores/react";
import { dirty, saving } from "../store";
import { generateColorsCss, generateGlobalCss } from "../engine/generate";
import { saveTokens } from "../api";
import { lightColors, darkColors, globalTokens, markClean } from "../store";

export function Toolbar() {
  const isDirty = useStore(dirty);
  const isSaving = useStore(saving);

  async function handleSave() {
    saving.set(true);
    try {
      const colorsCss = generateColorsCss(
        lightColors.get(),
        darkColors.get(),
      );
      const globalCss = generateGlobalCss(globalTokens.get());
      await saveTokens(colorsCss, globalCss);
      markClean();
    } finally {
      saving.set(false);
    }
  }

  return (
    <div className="preset-toolbar">
      <span className="text-sm font-semibold">Preset Engine</span>
      <span className="text-xs text-muted-foreground">
        {isDirty ? "● unsaved changes" : "saved"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the sidebar**

Create `src/components/Sidebar.tsx`:
```tsx
export interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "radius", label: "Radius" },
  { id: "spacing", label: "Spacing" },
  { id: "shadows", label: "Shadows" },
  { id: "breakpoints", label: "Breakpoints" },

];

const GALLERY_ITEMS: NavItem[] = [
  { id: "gallery:buttons", label: "Buttons" },
  { id: "gallery:inputs", label: "Inputs" },
  { id: "gallery:cards", label: "Cards" },
  { id: "gallery:badges", label: "Badges" },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="preset-sidebar">
      <div className="preset-section-label">Design Tokens</div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className="preset-nav-item"
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
      <div className="preset-section-label mt-4">Component Gallery</div>
      {GALLERY_ITEMS.map((item) => (
        <button
          key={item.id}
          className="preset-nav-item"
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Create the state panel**

Create `src/components/StatePanel.tsx`:
```tsx
import { useStore } from "@nanostores/react";
import { lightColors, darkColors, globalTokens, dirty } from "../store";

export function StatePanel() {
  const light = useStore(lightColors);
  const isDirty = useStore(dirty);
  const global = useStore(globalTokens);

  return (
    <aside className="preset-panel">
      <div className="mb-3 flex items-center justify-between">
        <span className="preset-section-label mb-0">Current Tokens</span>
      </div>
      <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
        <div>--primary: {light.primary ?? "—"}</div>
        <div>--background: {light.background ?? "—"}</div>
        <div>--radius: {global.radius}</div>
        <div>--spacing: {global.spacing}</div>
        <div>--font-sans: {global.fontSans?.slice(0, 30)}…</div>
        <div className="mt-2">dirty: {isDirty ? "yes" : "no"}</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Rewrite App.tsx with 3-column layout**

Rewrite `src/App.tsx`:
```tsx
import { useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { StatePanel } from "./components/StatePanel";

export function App() {
  const [activeSection, setActiveSection] = useState("colors");

  return (
    <div className="preset-layout">
      <Toolbar />
      <Sidebar active={activeSection} onSelect={setActiveSection} />
      <main className="preset-canvas">
        <p className="text-sm text-muted-foreground">
          Select a category from the sidebar to edit tokens.
        </p>
      </main>
      <StatePanel />
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

Run: `cd packages/preset-engine && pnpm dev`
Expected: 3-column layout — left sidebar (token editors), center canvas (LIVE GALLERY), right state panel. Like `ui.shadcn.com/create`.

- [ ] **Step 7: Verify typecheck**

Run: `pnpm --filter @repo/preset-engine typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/preset-engine/src/App.tsx packages/preset-engine/src/components/ packages/preset-engine/src/styles/dashboard.css
git commit -m "feat(preset-engine): add 3-column dashboard layout with toolbar, sidebar, state panel"
```

---

## Task 5: Color token editor

**Files:**
- Create: `packages/preset-engine/src/components/ColorPicker.tsx`
- Create: `packages/preset-engine/src/components/TokenEditor.tsx`
- Modify: `packages/preset-engine/src/App.tsx`

- [ ] **Step 1: Create the color picker**

Create `src/components/ColorPicker.tsx`:
```tsx
import { useCallback } from "react";

/**
 * Convert OKLCH string to hex for the native color input.
 * Simplified — handles the common oklch(L C H) format.
 */
// OKLCH → hex conversion is handled by the browser's CSS engine.
// The text input accepts oklch() strings directly — no hex conversion needed.

/**
 * A label + native color input + OKLCH text display.
 * The color input shows hex for the picker UI, but the stored value is always OKLCH.
 */
export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-2 py-1">
      <label className="w-40 shrink-0 text-xs text-muted-foreground">
        {label}
      </label>
      <input
        type="text"
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
        value={value}
        onChange={handleTextChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the token editor**

Create `src/components/TokenEditor.tsx`:
```tsx
import { useStore } from "@nanostores/react";
import { lightColors, darkColors, globalTokens, markDirty } from "../store";
import { ColorPicker } from "./ColorPicker";

export function TokenEditor({ section }: { section: string }) {
  const light = useStore(lightColors);
  const dark = useStore(darkColors);
  const global = useStore(globalTokens);

  function patchLight(key: string, val: string) {
    lightColors.set({ ...light, [key]: val });
    markDirty();
  }

  function patchDark(key: string, val: string) {
    darkColors.set({ ...dark, [key]: val });
    markDirty();
  }

  function patchGlobal(key: string, val: string) {
    globalTokens.set({ ...global, [key]: val });
    markDirty();
  }

  if (section === "colors") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Light Theme</h3>
        {Object.entries(light).map(([key, val]) => (
          <ColorPicker
            key={key}
            label={key}
            value={val}
            onChange={(v) => patchLight(key, v)}
          />
        ))}
        <h3 className="mb-3 mt-4 text-sm font-semibold">Dark Theme</h3>
        {Object.entries(dark).map(([key, val]) => (
          <ColorPicker
            key={key}
            label={key}
            value={val}
            onChange={(v) => patchDark(key, v)}
          />
        ))}
      </div>
    );
  }

  if (section === "radius") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Border Radius</h3>
        <div className="flex items-center gap-2 py-1">
          <label className="w-40 shrink-0 text-xs text-muted-foreground">
            base radius
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={global.radius}
            onChange={(e) => patchGlobal("radius", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (section === "typography") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Fonts</h3>
        <div className="flex items-center gap-2 py-1">
          <label className="w-40 shrink-0 text-xs text-muted-foreground">
            font-sans
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={global.fontSans}
            onChange={(e) => patchGlobal("fontSans", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 py-1">
          <label className="w-40 shrink-0 text-xs text-muted-foreground">
            font-mono
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={global.fontMono}
            onChange={(e) => patchGlobal("fontMono", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (section === "spacing") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Spacing</h3>
        <div className="flex items-center gap-2 py-1">
          <label className="w-40 shrink-0 text-xs text-muted-foreground">
            base spacing
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={global.spacing}
            onChange={(e) => patchGlobal("spacing", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 py-1">
          <label className="w-40 shrink-0 text-xs text-muted-foreground">
            sidebar width
          </label>
          <input
            type="text"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
            value={global.sidebarWidth}
            onChange={(e) => patchGlobal("sidebarWidth", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (section === "shadows") {
    // Shadows are currently hardcoded in global.css as static values.
    // The editor displays them for reference; full shadow token editing
    // requires extending the global.css @theme block (future enhancement).
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Shadows</h3>
        <p className="text-xs text-muted-foreground">
          Shadow tokens are defined in the @theme block. Edit global.css directly
          or extend this editor to support shadow presets.
        </p>
      </div>
    );
  }

  if (section === "breakpoints") {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">Breakpoints</h3>
        <p className="text-xs text-muted-foreground">
          Breakpoints are inherited from Tailwind v4 defaults.
          Override in global.css @theme block as needed.
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      {section} editor
    </div>
  );
}
```

- [ ] **Step 3: Wire into App.tsx**

Update `src/App.tsx` to load tokens on mount and render the editor:
```tsx
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { TokenEditor } from "./components/TokenEditor";
import { fetchTokens } from "./api";
import {
  lightColors,
  darkColors,
  globalTokens,
  loading,
} from "./store";
import { parseColorsCss, parseGlobalCss } from "./engine/parse";

export function App() {
  const [activeSection, setActiveSection] = useState("colors");
  const isLoading = useStore(loading);

  useEffect(() => {
    fetchTokens().then((res) => {
      if (res.ok && res.colors && res.global) {
        const colors = parseColorsCss(res.colors);
        lightColors.set(colors.light);
        darkColors.set(colors.dark);
        globalTokens.set(parseGlobalCss(res.global));
      }
      loading.set(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading tokens…</p>
      </div>
    );
  }

  return (
    <div className="preset-layout">
      <Toolbar />
      <Sidebar active={activeSection} onSelect={setActiveSection} />
      <main className="preset-canvas">
        {activeSection.startsWith("gallery:") ? (
          <Gallery section={activeSection} />
        ) : (
          <TokenEditor section={activeSection} />
        )}
      </main>
      <aside className="preset-panel">
        <p className="text-xs text-muted-foreground">Preview panel</p>
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Run: `cd packages/preset-engine && pnpm dev`
Expected: Colors section shows light/dark token editors with current values from colors.css. Editing a value marks as dirty. Save button writes back to the file.

- [ ] **Step 5: Verify save works**

Click Save, then check `packages/shared-ui/src/styles/colors.css` — the file should contain the updated values.

- [ ] **Step 6: Commit**

```bash
git add packages/preset-engine/src/components/ packages/preset-engine/src/App.tsx
git commit -m "feat(preset-engine): add color token editor with live save"
```

---

## Task 6: Live component gallery (CENTER CANVAS — always visible)

**Files:**
- Create: `packages/preset-engine/src/components/Gallery.tsx`
- Modify: `packages/preset-engine/src/App.tsx`

**Gallery sections (scrollable):**
- Buttons: Primary, Secondary, Destructive, Outline, Ghost, Link + sizes (Sm, Default, Lg, Icon) + with icons
- Inputs: Text fields (default, placeholder, email), File upload (drag & drop), Checkbox, Radio
- Toggle: On / Off states
- Select: Dropdown with options
- Slider: Range slider
- Cards: Basic card (title + description), Card with avatar (user info)
- Badges: Primary, Secondary, Destructive, Outline, Success, Warning
- Alert: Warning alert with title + description
- Dialog Trigger: Open Dialog, Open Alert Dialog buttons
- Toast Trigger: Show Toast button

- [ ] **Step 1: Create the gallery with CSS variable overrides**

Create `src/components/Gallery.tsx`:
```tsx
import { useStore } from "@nanostores/react";
import { lightColors, darkColors, globalTokens } from "../store";
import { RADIUS_MULTIPLIERS } from "../engine/scales";
import { useEffect, useRef } from "react";

/**
 * Injects a <style> element that overrides CSS variables in real-time.
 * This makes the gallery react instantly to token edits.
 */
export function Gallery({ section }: { section?: string }) {
  const light = useStore(lightColors);
  const dark = useStore(darkColors);
  const global = useStore(globalTokens);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement("style");
      document.head.appendChild(styleRef.current);
    }

    const vars: string[] = [];
    for (const [k, v] of Object.entries(light)) vars.push(`--${k}: ${v};`);
    vars.push(`--radius: ${global.radius};`);
    for (const [k, m] of Object.entries(RADIUS_MULTIPLIERS)) {
      if (k === "lg") vars.push(`--radius-lg: var(--radius);`);
      else vars.push(`--radius-${k}: calc(var(--radius) * ${m});`);
    }
    vars.push(`--spacing: ${global.spacing};`);
    vars.push(`--font-sans: ${global.fontSans};`);
    vars.push(`--font-mono: ${global.fontMono};`);
    vars.push(`--sidebar-width: ${global.sidebarWidth};`);
    styleRef.current.textContent = `:root { ${vars.join("\n")} }`;
  }, [light, dark, global]);

  // Component-specific galleries
  if (section === "gallery:buttons") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Primary</button>
          <button className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">Secondary</button>
          <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">Destructive</button>
          <button className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">Outline</button>
          <button className="rounded-md bg-transparent px-4 py-2 text-sm font-medium hover:bg-accent">Ghost</button>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Small</button>
          <button className="rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground">Large</button>
          <button className="size-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-sm">⌘</button>
        </div>
      </div>
    );
  }

  if (section === "gallery:inputs") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Inputs</h3>
        <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Default input" readOnly />
        <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Email address" type="email" readOnly />
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-sm border-2 border-primary bg-primary" />
          <span className="text-sm">Checkbox label</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-9 rounded-full bg-primary relative"><div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" /></div>
          <span className="text-sm">Toggle on</span>
        </div>
      </div>
    );
  }

  if (section === "gallery:cards") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Cards</h3>
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <h4 className="text-sm font-semibold">Card Title</h4>
          <p className="mt-1 text-xs text-muted-foreground">Card description with current design tokens.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted" />
            <div><div className="text-sm font-medium">User Name</div><div className="text-xs text-muted-foreground">user@example.com</div></div>
          </div>
        </div>
      </div>
    );
  }

  if (section === "gallery:badges") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Primary</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Secondary</span>
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Destructive</span>
          <span className="rounded-full border border-border bg-transparent px-3 py-1 text-xs font-medium">Outline</span>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">● Online</span>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">◐ Away</span>
        </div>
      </div>
    );
  }

  // Default: all components
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Live Preview</h3>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Primary</button>
        <button className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">Secondary</button>
        <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">Destructive</button>
      </div>
      <div className="flex gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Badge</span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Badge</span>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <h4 className="text-sm font-semibold">Card</h4>
        <p className="mt-1 text-xs text-muted-foreground">Current design tokens.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire Gallery into App.tsx**

Add to `src/App.tsx` in the preview panel:
```tsx
import { Gallery } from "./components/Gallery";
// ... in the aside:
<aside className="preset-panel">
  <Gallery />
</aside>
```

- [ ] **Step 3: Verify in browser**

Run: `cd packages/preset-engine && pnpm dev`
Expected: Preview panel shows buttons, badges, card, input — all reacting to token edits via CSS variable overrides.

- [ ] **Step 4: Commit**

```bash
git add packages/preset-engine/src/components/Gallery.tsx packages/preset-engine/src/App.tsx
git commit -m "feat(preset-engine): add live component gallery with CSS overrides"
```

---

## Task 7: Radius scale preview

**Files:**
- Create: `packages/preset-engine/src/components/RadiusPreview.tsx`

- [ ] **Step 1: Create the radius preview**

Create `src/components/RadiusPreview.tsx`:
```tsx
import { useStore } from "@nanostores/react";
import { globalTokens } from "../store";
import { RADIUS_MULTIPLIERS } from "../engine/scales";

export function RadiusPreview() {
  const global = useStore(globalTokens);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Radius Scale</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Base: {global.radius}
      </p>
      <div className="flex flex-wrap gap-3">
        {Object.entries(RADIUS_MULTIPLIERS).map(([key, mult]) => (
          <div key={key} className="text-center">
            <div
              className="mb-1 h-12 w-12 border-2 border-primary bg-primary/10"
              style={{ borderRadius: `calc(${global.radius} * ${mult})` }}
            />
            <span className="text-[10px] text-muted-foreground">
              {key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the radius section of TokenEditor**

In `src/components/TokenEditor.tsx`, import and render `RadiusPreview` in the radius section.

- [ ] **Step 3: Verify in browser**

Run: `cd packages/preset-engine && pnpm dev`
Expected: Radius section shows visual scale of all radius tokens derived from the base.

- [ ] **Step 4: Commit**

```bash
git add packages/preset-engine/src/components/RadiusPreview.tsx packages/preset-engine/src/components/TokenEditor.tsx
git commit -m "feat(preset-engine): add radius scale preview"
```

---

## Task 8: Codemod for hardcoded classes

**Files:**
- Create: `packages/preset-engine/src/engine/codemod.ts`
- Create: `packages/preset-engine/tests/codemod.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/codemod.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { codemodCssTs } from "../src/engine/codemod";

describe("codemodCssTs", () => {
  it("replaces bg-gray-900 with bg-primary in button default variant", () => {
    const input = `default: "bg-gray-900 text-white shadow-sm hover:bg-gray-900/90"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-primary");
    expect(result).not.toContain("bg-gray-900");
  });

  it("replaces bg-black/80 with bg-foreground/80 in overlays", () => {
    const input = `"fixed inset-0 z-50 bg-black/80"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-foreground/80");
    expect(result).not.toContain("bg-black");
  });

  it("replaces bg-black text-white in tooltip", () => {
    const input = `"z-50 rounded-sm bg-black px-3 py-1.5 text-white text-xs"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-foreground");
    expect(result).toContain("text-background");
  });

  it("does not touch already-semantic tokens", () => {
    const input = `"bg-primary text-primary-foreground"`;
    const result = codemodCssTs(input);
    expect(result).toBe(input);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/preset-engine test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the codemod**

Create `src/engine/codemod.ts`:
```ts
/**
 * Replacement rules for hardcoded Tailwind classes → semantic tokens.
 * Order matters: more specific patterns first.
 */
const RULES: Array<[RegExp, string]> = [
  // Button default variant
  [/bg-gray-900\/90/g, "bg-primary/90"],
  [/bg-gray-900/g, "bg-primary"],
  // Overlay dimming
  [/bg-black\/80/g, "bg-foreground/80"],
  // Tooltip / badge dark surfaces
  [/bg-black/g, "bg-foreground"],
  // White text on dark → semantic foreground
  [/\btext-white\b/g, "text-background"],
];

/**
 * Apply codemod rules to a *.css.ts file content.
 * Returns the modified content and a list of substitutions made.
 */
export function codemodCssTs(content: string): string {
  let result = content;
  for (const [pattern, replacement] of RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/preset-engine test`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add packages/preset-engine/src/engine/codemod.ts packages/preset-engine/tests/codemod.test.ts
git commit -m "feat(preset-engine): add codemod for hardcoded CSS classes"
```

---

## Task 9: Wire codemod into save flow

**Files:**
- Modify: `packages/preset-engine/src/components/Toolbar.tsx`
- Modify: `packages/preset-engine/vite.config.ts`

- [ ] **Step 1: Add codemod API endpoint**

In `vite.config.ts`, add a `/api/codemod` endpoint that reads `*.css.ts` files, applies the codemod, and writes them back.

- [ ] **Step 2: Trigger codemod on save**

In `Toolbar.tsx`, after saving CSS files, also call the codemod endpoint to rewrite hardcoded classes in component files.

- [ ] **Step 3: Verify in browser**

Run: `cd packages/preset-engine && pnpm dev`
Click Save → check that `button.css.ts` has `bg-primary` instead of `bg-gray-900`.

- [ ] **Step 4: Commit**

```bash
git add packages/preset-engine/src/components/Toolbar.tsx packages/preset-engine/vite.config.ts
git commit -m "feat(preset-engine): wire codemod into save flow"
```

---

## Task 10: Integration test + typecheck gate

**Files:**
- Create: `packages/preset-engine/tests/integration.test.ts`

- [ ] **Step 1: Write integration test**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseColorsCss, parseGlobalCss } from "../src/engine/parse";
import { generateColorsCss, generateGlobalCss } from "../src/engine/generate";

const SHARED_UI_ROOT = resolve(__dirname, "../../../shared-ui/src/styles");

describe("round-trip: parse → generate → parse", () => {
  it("colors.css round-trips without losing tokens", () => {
    const original = readFileSync(resolve(SHARED_UI_ROOT, "colors.css"), "utf8");
    const parsed = parseColorsCss(original);
    const regenerated = generateColorsCss(parsed.light, parsed.dark);

    // Every original token should appear in the regenerated output
    for (const [key, val] of Object.entries(parsed.light)) {
      expect(regenerated).toContain(`--${key}: ${val}`);
    }
    for (const [key, val] of Object.entries(parsed.dark)) {
      expect(regenerated).toContain(`--${key}: ${val}`);
    }
  });

  it("global.css round-trips without losing essential tokens", () => {
    const original = readFileSync(resolve(SHARED_UI_ROOT, "global.css"), "utf8");
    const parsed = parseGlobalCss(original);
    const regenerated = generateGlobalCss(parsed);

    expect(regenerated).toContain(`--radius: ${parsed.radius}`);
    expect(regenerated).toContain(`--spacing: ${parsed.spacing}`);
    expect(regenerated).toContain("@layer base");
    expect(regenerated).toContain("@keyframes accordion-down");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @repo/preset-engine test`
Expected: PASS (all tests including integration).

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @repo/preset-engine typecheck`
Expected: clean.

- [ ] **Step 4: Run lint**

Run: `pnpm --filter @repo/preset-engine lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/preset-engine/tests/integration.test.ts
git commit -m "test(preset-engine): add integration round-trip tests"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full typecheck**

Run: `pnpm --filter @repo/preset-engine typecheck`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `pnpm --filter @repo/preset-engine test`
Expected: all tests pass.

- [ ] **Step 3: Lint**

Run: `pnpm --filter @repo/preset-engine lint`
Expected: clean.

- [ ] **Step 4: Manual browser test**

1. `cd packages/preset-engine && pnpm dev`
2. Edit a color (e.g., change primary)
3. See gallery update live
4. Click Save
5. Verify `shared-ui/src/styles/colors.css` has the new value
6. Refresh the page — verify the editor loads the saved value
7. Open in a second browser tab — verify it shows the same state (seamless handoff)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(preset-engine): final integration and verification"
```
