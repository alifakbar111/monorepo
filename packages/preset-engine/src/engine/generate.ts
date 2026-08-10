import type { ColorTokens, GlobalTokens } from "./tokens";
import { RADIUS_MULTIPLIERS } from "./scales";

/**
 * Generate colors.css from light and dark token maps.
 * Matches the current shared-ui format: @layer utilities > :root > nested dark block.
 */
export function generateColorsCss(
  light: ColorTokens,
  dark: ColorTokens,
): string {
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
 * Generate the @theme color mappings from light color tokens.
 * Each --foo token becomes --color-foo: var(--foo).
 * Sidebar tokens get special prefix mapping (e.g., sidebar-background → sidebar).
 */
function generateColorMappings(light: ColorTokens): string {
  const lines: string[] = [];

  for (const key of Object.keys(light)) {
    // Sidebar tokens: --sidebar-background → --color-sidebar: var(--sidebar-background)
    if (key === "sidebar-background") {
      lines.push(`\t--color-sidebar: var(--${key});`);
    } else if (key === "sidebar-foreground") {
      lines.push(`\t--color-sidebar-foreground: var(--${key});`);
    } else if (key === "sidebar-primary") {
      lines.push(`\t--color-sidebar-primary: var(--${key});`);
    } else if (key === "sidebar-primary-foreground") {
      lines.push(`\t--color-sidebar-primary-foreground: var(--${key});`);
    } else if (key === "sidebar-accent") {
      lines.push(`\t--color-sidebar-accent: var(--${key});`);
    } else if (key === "sidebar-accent-foreground") {
      lines.push(`\t--color-sidebar-accent-foreground: var(--${key});`);
    } else if (key === "sidebar-border") {
      lines.push(`\t--color-sidebar-border: var(--${key});`);
    } else if (key === "sidebar-ring") {
      lines.push(`\t--color-sidebar-ring: var(--${key});`);
    } else {
      // Standard tokens: --primary → --color-primary: var(--primary)
      lines.push(`\t--color-${key}: var(--${key});`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate global.css from global token values and light color tokens.
 * Produces the @theme block + static wrapper (base layer, keyframes).
 */
export function generateGlobalCss(
  global: GlobalTokens,
  lightColors?: ColorTokens,
): string {
  const radiusVars = Object.entries(RADIUS_MULTIPLIERS)
    .map(([k, m]) => {
      if (k === "lg") return `\t--radius-${k}: var(--radius);`;
      return `\t--radius-${k}: calc(var(--radius) * ${m});`;
    })
    .join("\n");

  // Generate color mappings dynamically from light tokens
  const colorMappings = lightColors
    ? generateColorMappings(lightColors)
    : `/* color mappings generated from light tokens */`;

  return `@import "tailwindcss";

@theme {
\t/* Color Mappings */
${colorMappings}

\t/* Border Radius */
\t--radius: ${global.radius};
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
