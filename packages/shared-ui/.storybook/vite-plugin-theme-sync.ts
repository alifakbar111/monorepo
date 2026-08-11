/**
 * Vite Plugin for Theme Sync
 * 
 * This plugin adds a /theme-sync endpoint to the Storybook dev server
 * that automatically updates CSS files when theme changes are saved.
 */

import type { Plugin } from 'vite';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const STYLES_DIR = join(__dirname, '..', 'src', 'styles');
const COLORS_CSS_PATH = join(STYLES_DIR, 'colors.css');
const GLOBAL_CSS_PATH = join(STYLES_DIR, 'global.css');
const FONTFACE_CSS_PATH = join(STYLES_DIR, 'fontface.css');
const THEME_CHANGES_PATH = join(__dirname, 'theme-changes.json');

// Tokens that live directly in global.css's @theme block (not proxied through colors.css)
const GLOBAL_CSS_TOKENS = [
  '--spacing',
  '--font-heading',
  '--font-sans',
  '--font-mono',
  '--sidebar-width',
  '--sidebar-width-mobile',
  '--sidebar-width-icon',
];

// Delimits the block of @import rules generated from the Typography section's
// per-role Font Source URL fields. @import must precede all other rules in a
// CSS file, so this sits at the very top of fontface.css, above the
// hand-written @font-face blocks.
const FONT_IMPORTS_START = '/* @theme-editor:imports:start */';
const FONT_IMPORTS_END = '/* @theme-editor:imports:end */';

// Tokens whose value is a bare number that must carry a unit in CSS.
// DEFAULT_TOKENS in constants.ts stores these unitless (e.g. '0.25'); the editor
// UI only appends 'rem' once a user actually drags that specific slider, but
// "Save & Sync" always sends the whole tokens object, touched or not.
const SIZE_TOKENS = ['--radius', '--spacing', '--sidebar-width', '--sidebar-width-mobile', '--sidebar-width-icon'];

function withUnit(key: string, value: string): string {
  if (/\d(rem|px|em|%)$/.test(value)) {
    return value;
  }
  if (SIZE_TOKENS.includes(key)) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return `${num}rem`;
    }
  }
  return value;
}

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
      css += `\t\t${token}: ${withUnit(token, light[token])};\n`;
    }
  }

  css += `\n\t\t/* Spacing */\n`;
  if (light['--radius']) {
    css += `\t\t--radius: ${withUnit('--radius', light['--radius'])};\n`;
  }

  css += `\t}\n\n`;

  // Dark mode tokens
  css += `\t&:where([data-theme="dark"], [data-theme="dark"] *) {\n`;

  for (const token of DARK_MODE_TOKENS) {
    if (dark[token]) {
      css += `\t\t${token}: ${withUnit(token, dark[token])};\n`;
    }
  }

  // Dark mode spacing
  if (dark['--radius'] || light['--radius']) {
    css += `\n\t\t/* Spacing */\n`;
    css += `\t\t--radius: ${withUnit('--radius', dark['--radius'] || light['--radius'] || '0.6rem')};\n`;
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
 * Update global.css with font/spacing/sidebar-width tokens.
 * These live directly in the @theme block as literal values, so unlike colors.css
 * they're patched in place with a targeted regex rather than fully regenerated -
 * global.css also holds @import/@layer/@utility rules that must survive untouched.
 */
function updateGlobalCSS(themeData: { light?: Record<string, string> }): boolean {
  const { light = {} } = themeData;
  const relevantTokens = GLOBAL_CSS_TOKENS.filter((token) => light[token]);

  if (relevantTokens.length === 0) {
    return true;
  }

  try {
    let css = readFileSync(GLOBAL_CSS_PATH, 'utf-8');

    for (const token of relevantTokens) {
      const pattern = new RegExp(`(${token}\\s*:\\s*)[^;]+;`);
      if (pattern.test(css)) {
        css = css.replace(pattern, `$1${withUnit(token, light[token])};`);
      }
    }

    writeFileSync(GLOBAL_CSS_PATH, css, 'utf-8');
    console.log(`\x1b[32m✓ [Theme Sync] Updated global.css\x1b[0m`);
    return true;
  } catch (error) {
    console.error('\x1b[31m✗ [Theme Sync] Error updating global.css:\x1b[0m', error);
    return false;
  }
}

/**
 * Read the actual current token values off disk - colors.css and global.css
 * are the real source of truth Storybook's preview renders from. The editor
 * panel's own DEFAULT_TOKENS is a static snapshot that drifts the moment
 * either file changes by any means other than a fresh accurate re-snapshot
 * (a previous Save & Sync, a hand-edit, a git pull, ...), so the panel needs
 * to load from here rather than trust that snapshot alone.
 */
function readCurrentTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};

  // Colors/radius live in colors.css's :root block (light mode). Scoped to
  // just that block - colors.css also has a dark-mode block reusing the same
  // token names with different values, so searching the whole file would risk
  // picking up the dark value instead of the light one.
  try {
    const colorsCss = existsSync(COLORS_CSS_PATH) ? readFileSync(COLORS_CSS_PATH, 'utf-8') : '';
    const rootMatch = colorsCss.match(/:root\s*\{([^}]+)\}/);
    const rootBlock = rootMatch ? rootMatch[1] : '';

    for (const token of LIGHT_MODE_TOKENS) {
      const pattern = new RegExp(`${token}\\s*:\\s*([^;]+);`, 'g');
      const matches = [...rootBlock.matchAll(pattern)];
      if (matches.length > 0) {
        // Last match wins, matching CSS cascade semantics for the (known)
        // duplicate --radius declaration in colors.css.
        tokens[token] = matches[matches.length - 1][1].trim();
      }
    }
  } catch (error) {
    console.error('\x1b[31m✗ [Theme Sync] Error reading colors.css:\x1b[0m', error);
  }

  // Fonts/spacing/sidebar-width live directly in global.css's @theme block
  try {
    const globalCss = existsSync(GLOBAL_CSS_PATH) ? readFileSync(GLOBAL_CSS_PATH, 'utf-8') : '';
    for (const token of GLOBAL_CSS_TOKENS) {
      const pattern = new RegExp(`${token}\\s*:\\s*([^;]+);`, 'g');
      const matches = [...globalCss.matchAll(pattern)];
      if (matches.length > 0) {
        tokens[token] = matches[matches.length - 1][1].trim();
      }
    }
  } catch (error) {
    console.error('\x1b[31m✗ [Theme Sync] Error reading global.css:\x1b[0m', error);
  }

  return tokens;
}

/**
 * Update fontface.css's managed @import block from the Typography section's
 * per-role Font Source URLs (e.g. a Google Fonts CSS2 link, a Fontsource CSS
 * link, or any URL serving a stylesheet with @font-face rules inside it).
 * Fully regenerates the block on every save (rather than appending) so a URL
 * cleared from the UI actually disappears instead of accumulating stale imports.
 */
function updateFontFaceImports(themeData: { fontSourceUrls?: Record<string, string> }): boolean {
  const { fontSourceUrls = {} } = themeData;
  const urls = [...new Set(Object.values(fontSourceUrls).filter(Boolean))];

  try {
    const css = existsSync(FONTFACE_CSS_PATH) ? readFileSync(FONTFACE_CSS_PATH, 'utf-8') : '';

    const importBlock = [
      FONT_IMPORTS_START,
      ...urls.map((url) => `@import url('${url.replace(/'/g, '%27')}');`),
      FONT_IMPORTS_END,
    ].join('\n');

    const startIdx = css.indexOf(FONT_IMPORTS_START);
    const endIdx = css.indexOf(FONT_IMPORTS_END);

    let nextCss: string;
    if (startIdx !== -1 && endIdx !== -1) {
      nextCss = css.slice(0, startIdx) + importBlock + css.slice(endIdx + FONT_IMPORTS_END.length);
    } else {
      nextCss = `${importBlock}\n\n${css}`;
    }

    writeFileSync(FONTFACE_CSS_PATH, nextCss, 'utf-8');
    console.log(`\x1b[32m✓ [Theme Sync] Updated fontface.css\x1b[0m`);
    return true;
  } catch (error) {
    console.error('\x1b[31m✗ [Theme Sync] Error updating fontface.css:\x1b[0m', error);
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
        if (req.method === 'GET') {
          try {
            const light = readCurrentTokens();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ light }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Failed to read current theme' }));
          }
        } else if (req.method === 'POST') {
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
              const colorsUpdated = updateColorsCSS(themeData);
              const globalUpdated = updateGlobalCSS(themeData);
              const fontsUpdated = updateFontFaceImports(themeData);
              const success = colorsUpdated && globalUpdated && fontsUpdated;

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
