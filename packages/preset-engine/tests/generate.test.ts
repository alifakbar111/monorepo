import { describe, expect, it } from "vitest";
import { generateColorsCss, generateGlobalCss } from "../src/engine/generate";
import type { ColorTokens, GlobalTokens } from "../src/engine/tokens";

const LIGHT: ColorTokens = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.25 0.008 255.21)",
  primary: "oklch(0.55 0.191 263.8)",
};

const DARK: ColorTokens = {
  background: "oklch(0.15 0.011 252.11)",
  foreground: "oklch(0.98 0.003 252.11)",
  primary: "oklch(0.679 0.211 263.8)",
};

const GLOBAL: GlobalTokens = {
  radius: "0.6rem",
  spacing: "0.25rem",
  fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
  sidebarWidth: "16rem",
};

describe("generateColorsCss", () => {
  it("emits light tokens in :root", () => {
    const css = generateColorsCss(LIGHT, DARK);
    expect(css).toContain("--background: oklch(1 0 0)");
    expect(css).toContain("--primary: oklch(0.55 0.191 263.8)");
  });

  it("emits dark tokens nested inside :root", () => {
    const css = generateColorsCss(LIGHT, DARK);
    const rootStart = css.indexOf(":root {");
    const darkBlock = css.indexOf('[data-theme="dark"]', rootStart);
    expect(darkBlock).toBeGreaterThan(rootStart);
    expect(css).toContain("--background: oklch(0.15 0.011 252.11)");
  });

  it("wraps in @layer utilities", () => {
    const css = generateColorsCss(LIGHT, DARK);
    expect(css).toMatch(/^@layer utilities/);
  });
});

describe("generateGlobalCss", () => {
  it("emits @theme block with color mappings", () => {
    const css = generateGlobalCss(GLOBAL, LIGHT);
    expect(css).toContain("@theme {");
    expect(css).toContain("--color-background: var(--background)");
  });

  it("emits radius scale", () => {
    const css = generateGlobalCss(GLOBAL, LIGHT);
    expect(css).toContain("--radius: 0.6rem");
    expect(css).toContain("--radius-lg: var(--radius)");
  });

  it("emits font families", () => {
    const css = generateGlobalCss(GLOBAL, LIGHT);
    expect(css).toContain("--font-sans:");
    expect(css).toContain("--font-mono:");
  });

  it("emits static wrapper (base layer + keyframes)", () => {
    const css = generateGlobalCss(GLOBAL, LIGHT);
    expect(css).toContain("@layer base");
    expect(css).toContain("@keyframes accordion-down");
  });
});
