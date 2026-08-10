---
goal: Create a Storybook Theme Editor addon for shared-ui that allows engineers to customize CSS tokens (colors, spacing, typography) with live preview and preset management
version: 1.0
date_created: 2026-08-10
last_updated: 2026-08-10
owner: Engineering Team
status: 'Planned'
tags: ['feature', 'storybook', 'design-system', 'theming', 'shared-ui']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan covers the creation of a Storybook Theme Editor addon for the shared-ui package. The addon enables engineers to customize CSS tokens (colors, spacing, typography) with live component preview and preset management capabilities. This tool bridges the gap between Figma designs and implementation by allowing real-time theme customization before applying changes to the shared-ui source files.

## 1. Requirements & Constraints

- **REQ-001**: The addon must register as a Storybook panel in the manager UI
- **REQ-002**: Support editing all CSS custom properties defined in `colors.css` and `global.css`
- **REQ-003**: Provide real-time preview of token changes on component stories
- **REQ-004**: Support light and dark theme variants
- **REQ-005**: Allow saving/loading presets as JSON files
- **REQ-006**: Export presets in JSON, CSS variables, and Tailwind config formats
- **REQ-007**: Follow existing shared-ui code patterns and conventions
- **REQ-008**: Support font selection from Google Fonts catalog
- **REQ-009**: Support adding custom fonts via URL or file upload
- **REQ-010**: Provide font preview with sample text in different sizes
- **REQ-011**: Support font weight and style customization
- **REQ-012**: Generate `@font-face` declarations for custom fonts
- **REQ-013**: Export font configuration in CSS and Tailwind config formats
- **SEC-001**: No external API calls for preset storage (local-only)
- **CON-001**: Must integrate with existing Storybook 10.x setup
- **CON-002**: Must use Tailwind Variants (tv) for any new component styling
- **CON-003**: Must support React 19.x
- **GUD-001**: Follow shadcn/ui component patterns where applicable
- **GUD-002**: Use nanostores for state management consistency
- **PAT-001**: Follow existing `.storybook/` directory structure conventions

## 2. Implementation Steps

### Implementation Phase 1: Addon Infrastructure

- GOAL-001: Set up the addon directory structure and registration

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create addon directory structure at `packages/shared-ui/.storybook/addons/theme-editor/` | | |
| TASK-002 | Create `manager.ts` with addon registration using `addons.register()` and `addons.add()` | | |
| TASK-003 | Create `preview.ts` with `withThemeEditor` decorator that applies tokens via `document.documentElement.style.setProperty()` | | |
| TASK-004 | Create `constants.ts` with default token definitions, token metadata, and type definitions | | |
| TASK-005 | Update `.storybook/main.ts` to include `'./addons/theme-editor'` in addons array | | |
| TASK-006 | Update `.storybook/preview.ts` to import and apply `withThemeEditor` decorator | | |

### Implementation Phase 2: Token System

- GOAL-002: Define the token architecture and management system

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Create `types.ts` with TypeScript interfaces: `TokenDefinition`, `ThemePreset`, `TokenGroup`, `TokenType`, `FontConfig`, `FontSource` | | |
| TASK-008 | Create `tokens.ts` with complete token registry matching `colors.css` and `global.css` variables | | |
| TASK-009 | Create `tokenUtils.ts` with helper functions: `applyTokens()`, `generateCSS()`, `generateTailwindConfig()`, `parseColorValue()` | | |
| TASK-010 | Create `presetRegistry.ts` with built-in presets: default, corporate, vibrant, minimal | | |
| TASK-011 | Create `fontRegistry.ts` with Google Fonts catalog and font metadata | | |
| TASK-012 | Create `fontUtils.ts` with functions: `loadGoogleFont()`, `generateFontFace()`, `parseFontStack()` | | |

### Implementation Phase 3: UI Components

- GOAL-003: Build the token editor UI components

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create `ThemeEditor.tsx` main container component with state management using `useAddonState` | | |
| TASK-014 | Create `ColorGroup.tsx` component to group and display color token sections | | |
| TASK-015 | Create `ColorSection.tsx` component for collapsible color token group | | |
| TASK-016 | Create `ColorPicker.tsx` component with swatch preview, hex input, and popover color picker (using `react-colorful`) | | |
| TASK-017 | Create `SizeGroup.tsx` component for spacing and radius tokens | | |
| TASK-018 | Create `SliderInput.tsx` component with range slider and numeric input | | |
| TASK-019 | Create `TypographyGroup.tsx` component for font tokens | | |
| TASK-020 | Create `FontSelector.tsx` component with font preview, search, and dropdown | | |
| TASK-021 | Create `FontCard.tsx` component for displaying font preview with sample text | | |
| TASK-022 | Create `FontUploader.tsx` component for adding custom fonts via URL or file upload | | |
| TASK-023 | Create `FontWeightSelector.tsx` component for selecting font weights and styles | | |
| TASK-024 | Create `ThemeToggle.tsx` component for light/dark mode switching | | |

### Implementation Phase 4: Preset Management

- GOAL-004: Implement preset save/load/export functionality

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-025 | Create `PresetManager.tsx` component with preset dropdown, save button, and export menu | | |
| TASK-026 | Create `PresetCard.tsx` component for displaying preset preview with name, description, and color swatches | | |
| TASK-027 | Create `presetStorage.ts` with functions: `savePreset()`, `loadPreset()`, `listPresets()`, `deletePreset()` | | |
| TASK-028 | Create `exportUtils.ts` with export functions: `exportAsJSON()`, `exportAsCSS()`, `exportAsTailwindConfig()`, `copyToClipboard()` | | |
| TASK-029 | Create built-in preset JSON files: `default.json`, `corporate.json`, `vibrant.json`, `minimal.json` | | |
| TASK-030 | Create `fontPresetStorage.ts` with functions: `saveFontPreset()`, `loadFontPreset()`, `listFontPresets()` | | |

### Implementation Phase 5: Font Management

- GOAL-005: Implement comprehensive font management system

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-031 | Create Google Fonts integration with font search and selection | | |
| TASK-032 | Create font loading mechanism for Google Fonts via `<link>` injection | | |
| TASK-033 | Create custom font upload via URL input (CDN, self-hosted) | | |
| TASK-034 | Create local font file upload with drag-and-drop support | | |
| TASK-035 | Create font preview component with sample text, sizes, and weights | | |
| TASK-036 | Create font stack builder for fallback chain management | | |
| TASK-037 | Create `@font-face` CSS generator for custom fonts | | |
| TASK-038 | Create font token integration (update `--font-sans`, `--font-mono`) | | |
| TASK-039 | Create font preset collections (e.g., 'Modern', 'Classic', 'Monospace') | | |
| TASK-040 | Add font configuration to preset export/import | | |

## 3. Alternatives

- **ALT-001**: Standalone React app in `apps/preset-dashboard/` — Rejected because it would require separate build/deploy and wouldn't integrate with existing Storybook component previews
- **ALT-002**: CLI tool for preset generation — Rejected because it lacks visual preview capabilities needed for design exploration
- **ALT-003**: Browser extension for theme editing — Rejected because it would be harder to maintain and wouldn't integrate with the development workflow
- **ALT-004**: CSS-in-JS runtime injection only — Rejected because the requirement includes regenerating source CSS files for permanent theme application

## 4. Dependencies

- **DEP-001**: `@storybook/manager-api` v10.x — Storybook manager API for addon registration
- **DEP-002**: `@storybook/client-api` v10.x — Storybook client API for decorators
- **DEP-003**: `react-colorful` — Lightweight color picker component (needs to be added to dependencies)
- **DEP-004**: `tailwind-variants` v3.x — Already in shared-ui dependencies
- **DEP-005**: `nanostores` v1.x — Already in shared-ui dependencies for state management
- **DEP-006**: `@nanostores/react` v1.x — Already in shared-ui dependencies
- **DEP-007**: Google Fonts API — For fetching available fonts (optional, can use static catalog)

## 5. Files

- **FILE-001**: `packages/shared-ui/.storybook/main.ts` — Add addon registration
- **FILE-002**: `packages/shared-ui/.storybook/preview.ts` — Add theme editor decorator
- **FILE-003**: `packages/shared-ui/.storybook/addons/theme-editor/manager.ts` — Addon panel registration
- **FILE-004**: `packages/shared-ui/.storybook/addons/theme-editor/preview.ts` — Theme application decorator
- **FILE-005**: `packages/shared-ui/.storybook/addons/theme-editor/types.ts` — TypeScript type definitions
- **FILE-006**: `packages/shared-ui/.storybook/addons/theme-editor/constants.ts` — Token definitions and defaults
- **FILE-007**: `packages/shared-ui/.storybook/addons/theme-editor/tokens.ts` — Token registry
- **FILE-008**: `packages/shared-ui/.storybook/addons/theme-editor/tokenUtils.ts` — Token utility functions
- **FILE-009**: `packages/shared-ui/.storybook/addons/theme-editor/presetRegistry.ts` — Preset registry
- **FILE-010**: `packages/shared-ui/.storybook/addons/theme-editor/components/ThemeEditor.tsx` — Main editor component
- **FILE-011**: `packages/shared-ui/.storybook/addons/theme-editor/components/ColorGroup.tsx` — Color token group
- **FILE-012**: `packages/shared-ui/.storybook/addons/theme-editor/components/ColorSection.tsx` — Color section
- **FILE-013**: `packages/shared-ui/.storybook/addons/theme-editor/components/ColorPicker.tsx` — Color picker
- **FILE-014**: `packages/shared-ui/.storybook/addons/theme-editor/components/SizeGroup.tsx` — Size token group
- **FILE-015**: `packages/shared-ui/.storybook/addons/theme-editor/components/SliderInput.tsx` — Slider input
- **FILE-016**: `packages/shared-ui/.storybook/addons/theme-editor/components/TypographyGroup.tsx` — Typography group
- **FILE-017**: `packages/shared-ui/.storybook/addons/theme-editor/components/FontSelector.tsx` — Font selector
- **FILE-018**: `packages/shared-ui/.storybook/addons/theme-editor/components/ThemeToggle.tsx` — Theme toggle
- **FILE-019**: `packages/shared-ui/.storybook/addons/theme-editor/components/PresetManager.tsx` — Preset manager
- **FILE-020**: `packages/shared-ui/.storybook/addons/theme-editor/components/PresetCard.tsx` — Preset card
- **FILE-021**: `packages/shared-ui/.storybook/addons/theme-editor/utils/presetStorage.ts` — Preset storage
- **FILE-022**: `packages/shared-ui/.storybook/addons/theme-editor/utils/exportUtils.ts` — Export utilities
- **FILE-023**: `packages/shared-ui/.storybook/addons/theme-editor/styles/addon.css` — Addon styles
- **FILE-024**: `packages/shared-ui/.storybook/presets/default.json` — Default preset
- **FILE-025**: `packages/shared-ui/.storybook/presets/corporate.json` — Corporate preset
- **FILE-026**: `packages/shared-ui/.storybook/presets/vibrant.json` — Vibrant preset
- **FILE-027**: `packages/shared-ui/.storybook/presets/minimal.json` — Minimal preset
- **FILE-028**: `packages/shared-ui/package.json` — Add `react-colorful` dependency
- **FILE-029**: `packages/shared-ui/.storybook/addons/theme-editor/fontRegistry.ts` — Google Fonts catalog
- **FILE-030**: `packages/shared-ui/.storybook/addons/theme-editor/fontUtils.ts` — Font utility functions
- **FILE-031**: `packages/shared-ui/.storybook/addons/theme-editor/components/FontCard.tsx` — Font preview card
- **FILE-032**: `packages/shared-ui/.storybook/addons/theme-editor/components/FontUploader.tsx` — Custom font upload
- **FILE-033**: `packages/shared-ui/.storybook/addons/theme-editor/components/FontWeightSelector.tsx` — Font weight picker
- **FILE-034**: `packages/shared-ui/.storybook/addons/theme-editor/utils/fontPresetStorage.ts` — Font preset storage
- **FILE-035**: `packages/shared-ui/.storybook/presets/fonts/modern.json` — Modern font preset
- **FILE-036**: `packages/shared-ui/.storybook/presets/fonts/classic.json` — Classic font preset
- **FILE-037**: `packages/shared-ui/.storybook/presets/fonts/monospace.json` — Monospace font preset

## 6. Testing

- **TEST-001**: Unit tests for token utility functions (`tokenUtils.test.ts`)
- **TEST-002**: Unit tests for preset storage functions (`presetStorage.test.ts`)
- **TEST-003**: Unit tests for export utility functions (`exportUtils.test.ts`)
- **TEST-004**: Integration test for addon registration and panel rendering
- **TEST-005**: E2E test for token editing and live preview updates
- **TEST-006**: E2E test for preset save/load/export workflows
- **TEST-007**: Visual regression tests for addon UI components
- **TEST-008**: Type checking with `pnpm typecheck` in shared-ui package
- **TEST-009**: Lint checking with `pnpm lint` in shared-ui package
- **TEST-010**: Unit tests for font utility functions (`fontUtils.test.ts`)
- **TEST-011**: Unit tests for font preset storage (`fontPresetStorage.test.ts`)
- **TEST-012**: E2E test for font selection and loading
- **TEST-013**: E2E test for custom font upload and `@font-face` generation

## 7. Risks & Assumptions

- **RISK-001**: `react-colorful` bundle size may impact Storybook load time — Mitigation: Use tree-shaking and only import needed components
- **RISK-002**: Storybook 10.x API changes may require adjustments — Mitigation: Pin Storybook version and monitor changelog
- **RISK-003**: Complex token interactions may cause unexpected styling issues — Mitigation: Implement token validation and conflict detection
- **RISK-004**: Browser storage limits for locally saved presets — Mitigation: Implement preset export/import for backup
- **ASSUMPTION-001**: Engineers have Storybook running locally for addon development
- **ASSUMPTION-002**: The existing `colors.css` and `global.css` token structure is stable
- **ASSUMPTION-003**: The team prefers visual theme editing over CLI-based approaches
- **ASSUMPTION-004**: Presets will be shared via version control rather than a central repository
- **ASSUMPTION-005**: Google Fonts will be loaded via CDN `<link>` tags (not self-hosted)
- **ASSUMPTION-006**: Custom fonts will be uploaded as files or referenced via URL (not embedded)

## 8. Related Specifications / Further Reading

- [Tailwind Variants Documentation](https://www.tailwind-variants.org/)
- [Storybook Addons API](https://storybook.js.org/docs/react/addons/introduction)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [OKLCH Color Space](https://oklch.com/)
- [Google Fonts API](https://developers.google.com/fonts/docs/developer_api)
- [Modern Font Stacks](https://modernfontstacks.com/)
- [Font Face API MDN](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
- [packages/shared-ui/README.md](../packages/shared-ui/README.md)
