// Token types
export type TokenType = 'color' | 'size' | 'font' | 'select' | 'text';

// Token definition for UI rendering
export interface TokenDefinition {
  key: string;
  label: string;
  type: TokenType;
  group: string;
  defaultValue: string;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

// Token group for organizing tokens in UI
export interface TokenGroup {
  id: string;
  label: string;
  icon?: string;
  tokens: TokenDefinition[];
}

// Theme preset structure
export interface ThemePreset {
  name: string;
  version: string;
  description?: string;
  author?: string;
  createdAt?: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

// Font source types
export type FontSourceType = 'google' | 'url' | 'upload';

// Font configuration
export interface FontConfig {
  name: string;
  source: FontSourceType;
  url?: string;
  weights: string[];
  styles: string[];
  display?: string;
}

// Font stack configuration
export interface FontStack {
  token: string;
  label: string;
  fonts: string[];
}

// Preset with font configuration
export interface PresetWithFonts extends ThemePreset {
  fonts?: {
    sans?: FontStack;
    mono?: FontStack;
  };
}

// Addon state
export interface ThemeEditorState {
  tokens: Record<string, string>;
  fonts: Record<string, FontStack>;
  currentPreset: string | null;
  hasChanges: boolean;
}

// Export format types
export type ExportFormat = 'json' | 'css' | 'tailwind';

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeFonts: boolean;
  includeDarkMode: boolean;
}
