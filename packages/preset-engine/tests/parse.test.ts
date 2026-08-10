import { describe, expect, it } from "vitest";
import { parseColorsCss, parseGlobalCss } from "../src/engine/parse";

const SAMPLE_COLORS = `@layer utilities {
\t:root {
\t\t--background: oklch(1 0 0);
\t\t--foreground: oklch(0.25 0.008 255.21);
\t\t--primary: oklch(0.55 0.191 263.8);

\t\t&:where([data-theme="dark"], [data-theme="dark"] *) {
\t\t\t--background: oklch(0.15 0.011 252.11);
\t\t\t--foreground: oklch(0.98 0.003 252.11);
\t\t\t--primary: oklch(0.679 0.211 263.8);
\t\t}
\t}
}`;

const SAMPLE_GLOBAL = `@import "tailwindcss";

@theme {
\t--color-background: var(--background);
\t--color-primary: var(--primary);
\t--radius: 0.6rem;
\t--radius-lg: var(--radius);
\t--radius-md: calc(var(--radius) - 2px);
\t--radius-sm: calc(var(--radius) - 4px);
\t--spacing: 0.25rem;
\t--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
\t--font-mono: "JetBrains Mono", ui-monospace, monospace;
\t--sidebar-width: 16rem;
}`;

describe("parseColorsCss", () => {
  it("extracts light color tokens", () => {
    const result = parseColorsCss(SAMPLE_COLORS);
    expect(result.light.background).toBe("oklch(1 0 0)");
    expect(result.light.primary).toBe("oklch(0.55 0.191 263.8)");
  });

  it("extracts dark color tokens", () => {
    const result = parseColorsCss(SAMPLE_COLORS);
    expect(result.dark.background).toBe("oklch(0.15 0.011 252.11)");
    expect(result.dark.primary).toBe("oklch(0.679 0.211 263.8)");
  });
});

describe("parseGlobalCss", () => {
  it("extracts theme tokens", () => {
    const result = parseGlobalCss(SAMPLE_GLOBAL);
    expect(result.radius).toBe("0.6rem");
    expect(result.spacing).toBe("0.25rem");
    expect(result.fontSans).toContain("Inter");
    expect(result.fontMono).toContain("JetBrains Mono");
  });

  it("extracts sidebar width", () => {
    const result = parseGlobalCss(SAMPLE_GLOBAL);
    expect(result.sidebarWidth).toBe("16rem");
  });
});
