import type { ExportFormat, ExportOptions } from './types';
import { DEFAULT_TOKENS, DARK_MODE_OVERRIDES } from './constants';

/**
 * Apply tokens to the document root for live preview
 */
export function applyTokens(tokens: Record<string, string>): void {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Remove all token overrides from the document root
 */
export function clearTokens(): void {
  const root = document.documentElement;
  const defaultKeys = Object.keys(DEFAULT_TOKENS);
  defaultKeys.forEach((key) => {
    root.style.removeProperty(key);
  });
}

/**
 * Generate CSS variables string from tokens
 */
export function generateCSSVariables(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([key, value]) => `\t\t${key}: ${value};`)
    .join('\n');
}

/**
 * Generate complete CSS file content
 */
export function generateCSS(
  lightTokens: Record<string, string>,
  darkTokens: Record<string, string>,
  includeDarkMode: boolean = true
): string {
  let css = `@layer utilities {\n\t:root {\n`;
  css += generateCSSVariables(lightTokens);
  css += '\n\t}\n';

  if (includeDarkMode) {
    css += '\n\t&:where([data-theme="dark"], [data-theme="dark"] *) {\n';
    css += generateCSSVariables(darkTokens);
    css += '\n\t}\n';
  }

  css += '}\n';
  return css;
}

/**
 * Generate Tailwind config object
 */
export function generateTailwindConfig(
  tokens: Record<string, string>,
  includeFonts: boolean = true
): Record<string, unknown> {
  const colors: Record<string, string> = {};
  const fontSize: Record<string, string> = {};

  Object.entries(tokens).forEach(([key, value]) => {
    // Extract color tokens
    if (key.startsWith('--') && !key.includes('font') && !key.includes('radius') && !key.includes('spacing') && !key.includes('sidebar-width')) {
      const name = key
        .replace('--', '')
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      colors[name] = `var(${key})`;
    }
  });

  const config: Record<string, unknown> = {
    theme: {
      extend: {
        colors,
      },
    },
  };

  if (includeFonts) {
    const fontSans = tokens['--font-sans'] || DEFAULT_TOKENS['--font-sans'];
    const fontMono = tokens['--font-mono'] || DEFAULT_TOKENS['--font-mono'];

    (config.theme as Record<string, unknown>).extend = {
      ...(config.theme as Record<string, unknown>).extend,
      fontFamily: {
        sans: fontSans.split(',').map(f => f.trim().replace(/"/g, '')),
        mono: fontMono.split(',').map(f => f.trim().replace(/"/g, '')),
      },
    };
  }

  return config;
}

/**
 * Export tokens in specified format
 */
export function exportTokens(
  tokens: Record<string, string>,
  options: ExportOptions
): string {
  switch (options.format) {
    case 'json':
      return JSON.stringify(tokens, null, 2);
    case 'css':
      return generateCSS(
        tokens,
        options.includeDarkMode ? DARK_MODE_OVERRIDES : {},
        options.includeDarkMode
      );
    case 'tailwind':
      return JSON.stringify(generateTailwindConfig(tokens, options.includeFonts), null, 2);
    default:
      return JSON.stringify(tokens, null, 2);
  }
}

/**
 * Parse a color value to extract its components
 */
export function parseColorValue(value: string): { type: string; raw: string } {
  if (value.startsWith('oklch')) {
    return { type: 'oklch', raw: value };
  }
  if (value.startsWith('#')) {
    return { type: 'hex', raw: value };
  }
  if (value.startsWith('rgb')) {
    return { type: 'rgb', raw: value };
  }
  if (value.startsWith('hsl')) {
    return { type: 'hsl', raw: value };
  }
  return { type: 'unknown', raw: value };
}

/**
 * Convert OKLCH to hex (simplified - for display purposes)
 */
export function oklchToHex(oklch: string): string {
  // This is a simplified conversion for display
  // In production, use a proper color library
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return '#000000';

  const [, l, c, h] = match.map(Number);
  
  // Simplified conversion - just return a placeholder
  // In real implementation, use oklab/oklch conversion
  return `hsl(${h}, ${Math.round(c * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Validate token value
 */
export function validateTokenValue(key: string, value: string): boolean {
  // Color validation
  if (key.includes('color') || key.includes('foreground') || key === '--ring' || key === '--border' || key === '--input') {
    return /^(oklch|rgb|hsl|#)/.test(value);
  }
  
  // Size validation
  if (key.includes('radius') || key.includes('spacing') || key.includes('width')) {
    return /^[\d.]+(rem|px|em|%)?$/.test(value);
  }
  
  // Font validation
  if (key.includes('font')) {
    return value.length > 0;
  }
  
  return true;
}

/**
 * Download file with content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
