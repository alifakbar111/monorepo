/**
 * Vite Plugin for Theme Sync
 * 
 * This plugin adds a /theme-sync endpoint to the Storybook dev server
 * that automatically updates CSS files when theme changes are saved.
 */

import type { Plugin } from 'vite';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const STYLES_DIR = join(__dirname, '..', 'src', 'styles');
const COLORS_CSS_PATH = join(STYLES_DIR, 'colors.css');
const THEME_CHANGES_PATH = join(__dirname, 'theme-changes.json');

// Light mode tokens
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
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--success', '--success-foreground',
  '--info', '--info-foreground',
  '--warning', '--warning-foreground',
  '--error', '--error-foreground',
  '--radius',
];

// Dark mode tokens
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
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-accent', '--sidebar-accent-foreground',
  '--sidebar-border', '--sidebar-ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--success', '--success-foreground',
  '--info', '--info-foreground',
  '--warning', '--warning-foreground',
  '--error', '--error-foreground',
];

/**
 * Generate CSS content from theme data
 */
function generateCSS(themeData: { light?: Record<string, string>; dark?: Record<string, string> }): string {
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

  // Dark mode spacing
  if (dark['--radius'] || light['--radius']) {
    css += `\n\t\t/* Spacing */\n`;
    css += `\t\t--radius: ${dark['--radius'] || light['--radius'] || '0.6rem'};\n`;
  }

  css += `\t}\n}\n`;

  return css;
}

/**
 * Update colors.css file
 */
function updateColorsCSS(themeData: { light?: Record<string, string>; dark?: Record<string, string> }): boolean {
  try {
    // Ensure styles directory exists
    if (!existsSync(STYLES_DIR)) {
      mkdirSync(STYLES_DIR, { recursive: true });
    }

    const css = generateCSS(themeData);
    writeFileSync(COLORS_CSS_PATH, css, 'utf-8');
    console.log(`\x1b[32m✓ [Theme Sync] Updated colors.css\x1b[0m`);
    return true;
  } catch (error) {
    console.error('\x1b[31m✗ [Theme Sync] Error updating colors.css:\x1b[0m', error);
    return false;
  }
}

/**
 * Theme Sync Vite Plugin
 */
export function themeSyncPlugin(): Plugin {
  return {
    name: 'vite-plugin-theme-sync',
    configureServer(server) {
      // Add /theme-sync endpoint
      server.middlewares.use('/theme-sync', (req, res) => {
        if (req.method === 'POST') {
          let body = '';

          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            try {
              const themeData = JSON.parse(body);
              
              // Save to JSON file for reference
              writeFileSync(THEME_CHANGES_PATH, JSON.stringify(themeData, null, 2), 'utf-8');
              
              // Update CSS files
              const success = updateColorsCSS(themeData);

              if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Theme updated successfully' }));
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to update CSS files' }));
              }
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Invalid JSON data' }));
            }
          });
        } else {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
        }
      });

      console.log('\x1b[36m🎨 [Theme Sync] Endpoint available at /theme-sync\x1b[0m');
    },
  };
}

export default themeSyncPlugin;
