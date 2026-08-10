import { describe, expect, it } from "vitest";
import { codemodCssTs } from "../src/engine/codemod";

describe("codemodCssTs", () => {
  it("replaces bg-gray-900 with bg-primary in button default variant", () => {
    const input = `default: "bg-gray-900 text-white shadow-sm hover:bg-gray-900/90"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-primary");
    expect(result).not.toContain("bg-gray-900");
  });

  it("replaces bg-black/80 with bg-foreground/80 in overlays", () => {
    const input = `"fixed inset-0 z-50 bg-black/80"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-foreground/80");
    expect(result).not.toContain("bg-black");
  });

  it("replaces bg-black text-white in tooltip", () => {
    const input = `"z-50 rounded-sm bg-black px-3 py-1.5 text-white text-xs"`;
    const result = codemodCssTs(input);
    expect(result).toContain("bg-foreground");
    expect(result).toContain("text-primary-foreground");
  });

  it("does not touch already-semantic tokens", () => {
    const input = `"bg-primary text-primary-foreground"`;
    const result = codemodCssTs(input);
    expect(result).toBe(input);
  });
});
