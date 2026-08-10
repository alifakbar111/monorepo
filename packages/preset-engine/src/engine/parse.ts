import type { ColorTokens, GlobalTokens } from "./tokens";

/**
 * Parse colors.css to extract light and dark color token maps.
 * Expects the format: @layer utilities { :root { --token: value; &:where([data-theme="dark"] ...) { --token: value; } } }
 */
export function parseColorsCss(css: string): {
  light: ColorTokens;
  dark: ColorTokens;
} {
  const light: ColorTokens = {};
  const dark: ColorTokens = {};

  // Find :root block
  const rootMatch = css.match(/:root\s*\{/);
  if (!rootMatch) return { light, dark };

  const rootStart = rootMatch.index!;
  const rootContent = extractBlock(css, rootStart);

  // Parse light tokens (before dark block)
  const darkBlockMatch = rootContent.match(
    /&:where\(\[data-theme="dark"\]/,
  );
  const lightSection = darkBlockMatch
    ? rootContent.slice(0, darkBlockMatch.index!)
    : rootContent;

  for (const match of lightSection.matchAll(
    /--([a-zA-Z0-9-]+):\s*([^;]+);/g,
  )) {
    light[match[1]] = match[2].trim();
  }

  // Parse dark tokens (inside dark block)
  if (darkBlockMatch) {
    const darkStart = darkBlockMatch.index!;
    const darkSection = rootContent.slice(darkStart);
    for (const match of darkSection.matchAll(
      /--([a-zA-Z0-9-]+):\s*([^;]+);/g,
    )) {
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
