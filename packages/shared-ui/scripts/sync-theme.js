#!/usr/bin/env node

/**
 * Theme Sync Script
 * 
 * This script watches for theme changes from the Storybook Theme Editor
 * and automatically updates the CSS files in the shared-ui package.
 * 
 * Usage:
 *   pnpm sync-theme
 * 
 * How it works:
 *   1. Theme Editor saves changes to .storybook/theme-changes.json
 *   2. This script watches for file changes
 *   3. When changes detected, updates colors.css automatically
 */

import { watch, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const STYLES_DIR = join(__dirname, '..', 'src', 'styles');
const COLORS_CSS_PATH = join(STYLES_DIR, 'colors.css');
const THEME_CHANGES_PATH = join(__dirname, '..', '.storybook', 'theme-changes.json');

// Colors to extract from the theme changes (light mode tokens)
const LIGHT_MODE_TOKENS = [
  '--background', '--foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--destructive', '--destructive-foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--border', '--input', '--ring',
  // Sidebar
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  // Charts
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  // Status
  '--success', '--success-foreground',
  '--info', '--info-foreground',
  '--warning', '--warning-foreground',
  '--error', '--error-foreground',
  // Spacing
  '--radius',
];

// Dark mode tokens (subset that differs from light)
const DARK_MODE_TOKENS = [
  '--background', '--foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--destructive', '--destructive-foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--border', '--input', '--ring',
  // Sidebar
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  // Charts
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  // Status
  '--success', '--success-foreground',
  '--info', '--info-foreground',
  '--warning', '--warning-foreground',
  '--error', '--error-foreground',
];

/**
 * Generate CSS content from theme data
 */
function generateCSS(themeData) {
  const { light = {}, dark = {} } = themeData;

  let css = `@layer utilities {\n\t:root {\n`;

  // Light mode tokens
  for (const token of LIGHT_MODE_TOKENS) {
    if (light[token]) {
      css += `\t\t${token}: ${light[token]};\n`;
    }
  }

  css += `\n\t\t/* Spacing */\n`;
  if (light['--radius']) {
    css += `\t\t--radius: ${light['--radius']};\n`;
  }

  css += `\t}\n\n`;

  // Dark mode tokens
  css += `\t&:where([data-theme="dark"], [data-theme="dark"] *) {\n`;

  for (const token of DARK_MODE_TOKENS) {
    if (dark[token]) {
      css += `\t\t${token}: ${dark[token]};\n`;
    }
  }

  // Dark mode spacing (same as light unless specified)
  if (dark['--radius'] || light['--radius']) {
    css += `\n\t\t/* Spacing */\n`;
    css += `\t\t--radius: ${dark['--radius'] || light['--radius'] || '0.6rem'};\n`;
  }

  css += `\t}\n}\n`;

  return css;
}

/**
 * Update colors.css with new theme data
 */
function updateColorsCSS(themeData) {
  try {
    // Ensure styles directory exists
    if (!existsSync(STYLES_DIR)) {
      console.error(`❌ Styles directory not found: ${STYLES_DIR}`);
      return false;
    }

    const css = generateCSS(themeData);
    writeFileSync(COLORS_CSS_PATH, css, 'utf-8');
    console.log(`✅ Updated colors.css`);
    return true;
  } catch (error) {
    console.error('❌ Error updating colors.css:', error.message);
    return false;
  }
}

/**
 * Process theme changes file
 */
function processThemeChanges() {
  try {
    if (!existsSync(THEME_CHANGES_PATH)) {
      return;
    }

    const content = readFileSync(THEME_CHANGES_PATH, 'utf-8');
    const themeData = JSON.parse(content);

    if (themeData && (themeData.light || themeData.dark)) {
      console.log('\n📝 Theme changes detected...');
      updateColorsCSS(themeData);
    }
  } catch (error) {
    console.error('❌ Error reading theme changes:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🎨 Theme Sync Script Started');
  console.log(`📁 Watching: ${THEME_CHANGES_PATH}`);
  console.log(`📝 Updating: ${COLORS_CSS_PATH}`);
  console.log('\nPress Ctrl+C to stop.\n');

  // Initial processing
  processThemeChanges();

  // Watch for changes
  const watcher = watch(THEME_CHANGES_PATH, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
      // Small delay to ensure file write is complete
      setTimeout(processThemeChanges, 100);
    }
  });

  watcher.on('error', (error) => {
    console.error('❌ Watcher error:', error.message);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping theme sync...');
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watcher.close();
    process.exit(0);
  });
}

main();
