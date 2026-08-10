# Preset Engine — Developer Workflow

> How to use the preset engine to customize shared-ui design tokens.
> One preset change affects ALL apps in the monorepo that use shared-ui.

## Architecture

```
preset-engine ──writes──→ shared-ui/colors.css + global.css
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼
               apps/web   apps/dashboard
               (Next.js)  (React)
               same Button, same tokens everywhere
```

**Key insight:** shared-ui owns the tokens. All apps inherit them. One preset change = all apps update.

## Quick Start

```bash
# 1. Start the preset engine (from shared-ui)
cd packages/shared-ui
pnpm preset

# 2. Browser opens to http://localhost:6100
# 3. Edit tokens, see live preview, save
# 4. ALL apps using shared-ui pick up the changes
```

## The Workflow

### Step 1: Open the Dashboard

```bash
pnpm --filter @repo/shared-ui preset
```

The dashboard opens in your browser with a 3-column layout:
- **Left sidebar** — token categories (Colors, Typography, Radius, Spacing) + component gallery
- **Center canvas** — editors and live component previews
- **Right panel** — current token values (live state)

### Step 2: Load the Client's Figma

Open the client's Figma file side-by-side with the dashboard. The dashboard reads the current `colors.css` + `global.css` values, so you see exactly what's live.

### Step 3: Edit Tokens

Work through each category:

#### Colors (Light + Dark)
- Each color token shows its current OKLCH value
- Edit the text input to change a color (paste from Figma's CSS output)
- The gallery reacts instantly via CSS variable overrides

**Common tokens to edit:**
| Token | What It Controls |
|-------|-----------------|
| `primary` | Brand color, active states |
| `background` | Page background |
| `foreground` | Default text color |
| `muted` | Subtle surfaces |
| `border` | Borders and separators |
| `destructive` | Error/danger states |

#### Typography
- Edit `font-sans` and `font-mono` font stacks
- Type scale is inherited from Tailwind v4 defaults

#### Radius
- Set the base `--radius` value (e.g., `0.625rem`)
- The scale (sm, md, lg, xl, 2xl, 3xl, 4xl) derives automatically
- Visual preview shows all radius steps

#### Spacing
- Edit the base spacing unit
- Sidebar width

### Step 4: Preview Components

Use the **Component Gallery** section in the left sidebar to see specific component groups:
- **Buttons** — primary, secondary, destructive, outline, ghost, all sizes
- **Inputs** — text fields, checkboxes, toggles
- **Cards** — basic card, card with avatar
- **Badges** — all variants

Each gallery renders the **real shared-ui components** with CSS variable overrides, so what you see is exactly what ships.

### Step 5: Save

Click **Save** in the toolbar. This:

1. **Writes `colors.css`** — regenerates the light/dark color variables
2. **Writes `global.css`** — regenerates the `@theme` block with radius scale, fonts, spacing
3. **Runs codemod** — rewrites any hardcoded classes in `*.css.ts` files (e.g., `bg-gray-900` → `bg-primary`)

The right panel shows "saved" when the write completes.

### Step 6: Verify in ANY App

```bash
# In any app that uses shared-ui — they ALL see the changes
pnpm --filter nextjs-app dev     # website shows new tokens
pnpm --filter dashboard dev      # admin panel shows same new tokens
```

The change cascades everywhere because components reference CSS variables (`bg-primary`, `text-foreground`, `rounded-lg`), not hardcoded values.

### Step 7: Commit (shared-ui only)

```bash
cd packages/shared-ui
git add src/styles/colors.css src/styles/global.css src/components/
git commit -m "feat(shared-ui): update design tokens for client X"
```

Only shared-ui files change. No app files are modified — they inherit the new tokens automatically.

## Seamless Handoff (Multi-Engineer)

The CSS files ARE the state. No separate preset.json to conflict.

```
Engineer A: opens dashboard → edits tokens → saves → commits (shared-ui only)
Engineer B: pulls latest → opens dashboard → sees Engineer A's changes → continues editing
```

When Engineer B opens the dashboard, it reads the current files from disk. No resets, no lost work.

## What Gets Changed

**Only shared-ui files are modified.** No app files change.

| File (inside shared-ui) | What Changes |
|------|-------------|
| `src/styles/colors.css` | All `--primary`, `--background`, etc. values (light + dark) |
| `src/styles/global.css` | `@theme` block: radius scale, fonts, spacing, sidebar width |
| `src/components/button/button.css.ts` | `bg-gray-900` → `bg-primary` (codemod) |
| `src/components/drawer/drawer.css.ts` | `bg-black/80` → `bg-foreground/80` (codemod) |
| `src/components/tooltip/tooltip.css.ts` | `bg-black text-white` → `bg-foreground text-background` (codemod) |
| `src/components/dialog/dialog.css.ts` | `bg-black/80` → `bg-foreground/80` (codemod) |
| `src/components/sheet/sheet.css.ts` | `bg-black/80` → `bg-foreground/80` (codemod) |
| `src/components/alert-dialog/alert-dialog.css.ts` | `bg-black/80` → `bg-foreground/80` (codemod) |

**What does NOT change:** App files (`apps/web/`, `apps/dashboard/`, etc.) — they inherit tokens automatically via CSS variable cascade.

## Multi-App Scenario

```
Project: my-project
├── packages/shared-ui/    ← preset engine edits HERE
│   └── src/styles/
│       ├── colors.css     ← tokens live here
│       └── global.css     ← @theme lives here
├── apps/web/              ← Next.js app (uses shared-ui Button)
└── apps/dashboard/        ← React app (uses shared-ui Button)

One preset change → all apps update automatically
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard shows stale values | Hard refresh (Ctrl+Shift+R) — the dashboard reads files on mount |
| Gallery doesn't update | Check browser console for CSS variable injection errors |
| Save fails | Check terminal for API errors — usually a file permission issue |
| Codemod missed a class | The codemod only handles `bg-gray-*`, `bg-black`, `text-white`. Other hardcoded classes need manual review |
| Components look wrong after save | Verify `colors.css` has both light AND dark blocks. Missing dark block = no dark theme |

## New Project Bootstrap

Starting from scratch with multiple frontend apps:

```bash
# 1. Create monorepo
pnpm dlx moci init my-project
cd my-project

# 2. Generate apps (each gets shared-ui as a dependency)
moon generate nextjs        # → apps/web/
moon generate react-app     # → apps/dashboard/

# 3. Install dependencies
pnpm install

# 4. Customize design tokens for the client
pnpm --filter @repo/shared-ui preset
# → Edit colors, fonts, radius, spacing in the dashboard
# → Save → shared-ui CSS files updated

# 5. All apps pick up the new tokens
pnpm --filter web dev           # website with new tokens
pnpm --filter dashboard dev     # admin with same new tokens

# 6. Commit
git add packages/shared-ui/src/styles/
git commit -m "feat(shared-ui): design tokens for client X"
```

## FAQ

**Q: Can I use this with a project that doesn't use shared-ui?**
A: Not yet. The preset engine reads/writes shared-ui's specific file structure. A generic mode could be added later.

**Q: What if I need to add a new color token?**
A: Edit `colors.css` directly to add the new `--token-name` variable, then add `--color-token-name: var(--token-name)` to the `@theme` block in `global.css`. The dashboard will pick it up on next load.

**Q: Can I undo a save?**
A: Use git: `git checkout -- src/styles/colors.css src/styles/global.css`. The codemod changes to `*.css.ts` files can also be reverted with git.

**Q: Does this work with the template system?**
A: Yes. When you generate a new app from a template, it includes shared-ui as a dependency. The preset engine customizes shared-ui's tokens, and all apps inherit them.

**Q: What if two clients need different tokens?**
A: Create separate monorepos for each client. Each monorepo has its own shared-ui with its own tokens. The preset engine is designed for one-client-per-monorepo.
