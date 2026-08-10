import type { TokenDefinition, TokenGroup, ThemePreset, FontStack } from './types';

// Default token values from shared-ui colors.css and global.css
export const DEFAULT_TOKENS: Record<string, string> = {
  // Base Colors
  '--background': 'oklch(1 0 0)',
  '--foreground': 'oklch(0.25 0.008 255.21)',

  // Primary Colors
  '--primary': 'oklch(0.55 0.191 263.8)',
  '--primary-foreground': 'oklch(0.98 0.003 252.11)',

  // Secondary Colors
  '--secondary': 'oklch(0.95 0.005 252.11)',
  '--secondary-foreground': 'oklch(0.25 0.008 252.11)',

  // Destructive Colors
  '--destructive': 'oklch(0.589 0.199 27.84)',
  '--destructive-foreground': 'oklch(0.99 0.001 253.77)',

  // Card Colors
  '--card': 'oklch(1 0 0)',
  '--card-foreground': 'oklch(0.15 0.011 252.11)',

  // Popover Colors
  '--popover': 'oklch(1 0 0)',
  '--popover-foreground': 'oklch(0.15 0.011 252.11)',

  // Muted Colors
  '--muted': 'oklch(0.95 0.005 252.11)',
  '--muted-foreground': 'oklch(0.55 0.015 252.11)',

  // Accent Colors
  '--accent': 'oklch(0.95 0.005 252.11)',
  '--accent-foreground': 'oklch(0.25 0.008 252.11)',

  // Border & Input Colors
  '--border': 'oklch(0.89 0.008 252.11)',
  '--input': 'oklch(0.89 0.008 252.11)',
  '--ring': 'oklch(0.25 0.008 252.11)',

  // Sidebar Colors
  '--sidebar-background': 'oklch(0.98 0.003 252.11)',
  '--sidebar-foreground': 'oklch(0.35 0.015 252.11)',
  '--sidebar-primary': 'oklch(0.25 0.008 252.11)',
  '--sidebar-primary-foreground': 'oklch(0.98 0.003 252.11)',
  '--sidebar-accent': 'oklch(0.95 0.005 252.11)',
  '--sidebar-accent-foreground': 'oklch(0.25 0.008 252.11)',
  '--sidebar-border': 'oklch(0.89 0.015 251.27)',
  '--sidebar-ring': 'oklch(0.65 0.191 263.8)',

  // Chart Colors
  '--chart-1': 'oklch(0.639 0.199 27.84)',
  '--chart-2': 'oklch(0.513 0.128 194.68)',
  '--chart-3': 'oklch(0.329 0.082 220.93)',
  '--chart-4': 'oklch(0.689 0.193 85.59)',
  '--chart-5': 'oklch(0.689 0.224 44.94)',

  // Status Colors
  '--success': 'oklch(0.571 0.191 143.8)',
  '--success-foreground': 'oklch(0.98 0.003 253.77)',
  '--info': 'oklch(0.571 0.191 263.8)',
  '--info-foreground': 'oklch(0.98 0.003 253.77)',
  '--warning': 'oklch(0.571 0.191 83.8)',
  '--warning-foreground': 'oklch(0.98 0.003 253.77)',
  '--error': 'oklch(0.589 0.199 27.84)',
  '--error-foreground': 'oklch(0.98 0.003 252.11)',

  // Border Radius
  '--radius': '0.6',

  // Spacing
  '--spacing': '0.25',

  // Typography
  '--font-sans': '"Inter", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  '--font-mono': '"JetBrains Mono", ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',

  // Sidebar Width
  '--sidebar-width': '16rem',
  '--sidebar-width-mobile': '18rem',
  '--sidebar-width-icon': '3rem',
};

// Dark mode token overrides
export const DARK_MODE_OVERRIDES: Record<string, string> = {
  '--background': 'oklch(0.15 0.011 252.11)',
  '--foreground': 'oklch(0.98 0.003 252.11)',
  '--primary': 'oklch(0.679 0.211 263.8)',
  '--primary-foreground': 'oklch(0.25 0.008 252.11)',
  '--secondary': 'oklch(0.28 0.008 252.11)',
  '--secondary-foreground': 'oklch(0.98 0.003 252.11)',
  '--card': 'oklch(0.15 0.011 252.11)',
  '--card-foreground': 'oklch(0.98 0.003 252.11)',
  '--popover': 'oklch(0.15 0.011 252.11)',
  '--popover-foreground': 'oklch(0.98 0.003 252.11)',
  '--muted': 'oklch(0.28 0.008 252.11)',
  '--muted-foreground': 'oklch(0.65 0.015 252.11)',
  '--accent': 'oklch(0.28 0.008 252.11)',
  '--accent-foreground': 'oklch(0.98 0.003 252.11)',
  '--border': 'oklch(0.28 0.008 252.11)',
  '--input': 'oklch(0.28 0.008 252.11)',
  '--ring': 'oklch(0.85 0.008 252.11)',
  '--sidebar-background': 'oklch(0.18 0.003 252.11)',
  '--sidebar-foreground': 'oklch(0.95 0.005 252.11)',
  '--sidebar-primary': 'oklch(0.55 0.191 263.8)',
  '--sidebar-primary-foreground': 'oklch(1 0 0)',
  '--sidebar-accent': 'oklch(0.28 0.008 252.11)',
  '--sidebar-accent-foreground': 'oklch(0.95 0.005 252.11)',
  '--sidebar-border': 'oklch(0.28 0.008 252.11)',
  '--sidebar-ring': 'oklch(0.65 0.191 263.8)',
  '--chart-1': 'oklch(0.571 0.191 263.8)',
  '--chart-2': 'oklch(0.571 0.128 194.68)',
  '--chart-3': 'oklch(0.571 0.199 27.84)',
  '--chart-4': 'oklch(0.571 0.161 14.18)',
  '--chart-5': 'oklch(0.571 0.193 85.59)',
  '--success': 'oklch(0.521 0.161 143.8)',
  '--success-foreground': 'oklch(0.25 0.008 252.11)',
  '--info': 'oklch(0.521 0.161 263.8)',
  '--info-foreground': 'oklch(0.25 0.008 252.11)',
  '--warning': 'oklch(0.521 0.161 83.8)',
  '--warning-foreground': 'oklch(0.25 0.008 252.11)',
  '--error': 'oklch(0.589 0.199 27.84)',
  '--error-foreground': 'oklch(0.25 0.008 252.11)',
};

// Token definitions for UI
export const TOKEN_DEFINITIONS: TokenDefinition[] = [
  // Base Colors
  { key: '--background', label: 'Background', type: 'color', group: 'base', defaultValue: DEFAULT_TOKENS['--background'] },
  { key: '--foreground', label: 'Foreground', type: 'color', group: 'base', defaultValue: DEFAULT_TOKENS['--foreground'] },

  // Primary Colors
  { key: '--primary', label: 'Primary', type: 'color', group: 'brand', defaultValue: DEFAULT_TOKENS['--primary'] },
  { key: '--primary-foreground', label: 'Primary Foreground', type: 'color', group: 'brand', defaultValue: DEFAULT_TOKENS['--primary-foreground'] },

  // Secondary Colors
  { key: '--secondary', label: 'Secondary', type: 'color', group: 'brand', defaultValue: DEFAULT_TOKENS['--secondary'] },
  { key: '--secondary-foreground', label: 'Secondary Foreground', type: 'color', group: 'brand', defaultValue: DEFAULT_TOKENS['--secondary-foreground'] },

  // Destructive Colors
  { key: '--destructive', label: 'Destructive', type: 'color', group: 'status', defaultValue: DEFAULT_TOKENS['--destructive'] },
  { key: '--destructive-foreground', label: 'Destructive Foreground', type: 'color', group: 'status', defaultValue: DEFAULT_TOKENS['--destructive-foreground'] },

  // Card Colors
  { key: '--card', label: 'Card', type: 'color', group: 'surface', defaultValue: DEFAULT_TOKENS['--card'] },
  { key: '--card-foreground', label: 'Card Foreground', type: 'color', group: 'surface', defaultValue: DEFAULT_TOKENS['--card-foreground'] },

  // Popover Colors
  { key: '--popover', label: 'Popover', type: 'color', group: 'surface', defaultValue: DEFAULT_TOKENS['--popover'] },
  { key: '--popover-foreground', label: 'Popover Foreground', type: 'color', group: 'surface', defaultValue: DEFAULT_TOKENS['--popover-foreground'] },

  // Muted Colors
  { key: '--muted', label: 'Muted', type: 'color', group: 'neutral', defaultValue: DEFAULT_TOKENS['--muted'] },
  { key: '--muted-foreground', label: 'Muted Foreground', type: 'color', group: 'neutral', defaultValue: DEFAULT_TOKENS['--muted-foreground'] },

  // Accent Colors
  { key: '--accent', label: 'Accent', type: 'color', group: 'neutral', defaultValue: DEFAULT_TOKENS['--accent'] },
  { key: '--accent-foreground', label: 'Accent Foreground', type: 'color', group: 'neutral', defaultValue: DEFAULT_TOKENS['--accent-foreground'] },

  // Border & Input Colors
  { key: '--border', label: 'Border', type: 'color', group: 'border', defaultValue: DEFAULT_TOKENS['--border'] },
  { key: '--input', label: 'Input', type: 'color', group: 'border', defaultValue: DEFAULT_TOKENS['--input'] },
  { key: '--ring', label: 'Ring', type: 'color', group: 'border', defaultValue: DEFAULT_TOKENS['--ring'] },
  { key: '--radius', label: 'Border Radius', type: 'size', group: 'border', defaultValue: DEFAULT_TOKENS['--radius'], min: 0, max: 2, step: 0.1, unit: 'rem' },

  // Spacing
  { key: '--spacing', label: 'Spacing', type: 'size', group: 'spacing', defaultValue: DEFAULT_TOKENS['--spacing'], min: 0.1, max: 1, step: 0.05, unit: 'rem' },

  // Typography
  { key: '--font-sans', label: 'Sans Serif Font', type: 'font', group: 'typography', defaultValue: DEFAULT_TOKENS['--font-sans'] },
  { key: '--font-mono', label: 'Monospace Font', type: 'font', group: 'typography', defaultValue: DEFAULT_TOKENS['--font-mono'] },
];

// Token groups for UI organization
export const TOKEN_GROUPS: TokenGroup[] = [
  { id: 'base', label: 'Base Colors', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'base') },
  { id: 'brand', label: 'Brand Colors', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'brand') },
  { id: 'surface', label: 'Surface Colors', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'surface') },
  { id: 'neutral', label: 'Neutral Colors', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'neutral') },
  { id: 'status', label: 'Status Colors', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'status') },
  { id: 'border', label: 'Border & Radius', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'border') },
  { id: 'spacing', label: 'Spacing', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'spacing') },
  { id: 'typography', label: 'Typography', tokens: TOKEN_DEFINITIONS.filter(t => t.group === 'typography') },
];

// Default font stacks
export const DEFAULT_FONT_SANS: FontStack = {
  token: '--font-sans',
  label: 'Sans Serif',
  fonts: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
};

export const DEFAULT_FONT_MONO: FontStack = {
  token: '--font-mono',
  label: 'Monospace',
  fonts: ['JetBrains Mono', 'ui-monospace', 'Cascadia Code', 'Source Code Pro', 'monospace'],
};

// Default theme preset
export const DEFAULT_PRESET: ThemePreset = {
  name: 'Default',
  version: '1.0.0',
  description: 'Original shared-ui theme',
  light: DEFAULT_TOKENS,
  dark: DARK_MODE_OVERRIDES,
};

// Addon ID
export const ADDON_ID = 'theme-editor';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const EVENT_KEY = `${ADDON_ID}/theme-update`;
export const PRESET_EVENT_KEY = `${ADDON_ID}/preset-load`;
