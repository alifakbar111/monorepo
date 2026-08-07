import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";
import { buildPreviewCss } from "../src/preset/preview";
import { buildResolvedSpec } from "../scripts/component-map";
import { toHex } from "../src/preset/components/TokenPanel";

const preset = presetSchema.parse(
	JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
);

describe("buildPreviewCss", () => {
	it("emits color vars for the active theme", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--primary: ");
	});

	it("emits semantic radius vars from groups", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--radius-button: ");
		expect(css).toContain("--radius-overlay: ");
	});

	it("emits container vars for component sizes", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--container-dialog-sm: ");
		expect(css).toContain("--container-dialog-lg: ");
	});

	it("emits type role vars", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(css).toContain("--text-body: ");
		expect(css).toContain("--text-body--line-height: ");
	});

	it("per-mode parity: convert emits the SNAPPED radius value, as-is the LITERAL (defect-1)", () => {
		const convert = structuredClone(preset);
		convert.radius.base = { value: "13px", mode: "convert" };
		const css = buildPreviewCss(convert, buildResolvedSpec(convert), "light");
		expect(css).toContain("--radius: 0.75rem");
		expect(css).not.toContain("--radius: 13px");

		const asIs = structuredClone(preset);
		asIs.radius.base = { value: "13px", mode: "as-is" };
		const css2 = buildPreviewCss(asIs, buildResolvedSpec(asIs), "light");
		expect(css2).toContain("--radius: 13px");
	});

	it("a component radius override emits its own token (component > group > base, defect-6)", () => {
		const withOverride = structuredClone(preset);
		(withOverride.components.dialog as Record<string, unknown>).radius = { value: "2px", mode: "convert" };
		const css = buildPreviewCss(withOverride, buildResolvedSpec(withOverride), "light");
		expect(css).toContain("--radius-dialog: ");
	});

	it("oklch picker round-trips: hex -> oklch string preserves a parseable value (defect-9)", () => {
		const css = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		// every stored color must stay oklch — a raw hex in preset.json would break the picker
		for (const value of Object.values(preset.colors.light)) {
			expect(value).toMatch(/^(oklch\(|#[0-9a-fA-F]{6})/);
		}
		expect(css).toMatch(/--primary: oklch\(/);
	});

	it("emits font family vars and hosted @import", () => {
		const hosted = structuredClone(preset);
		hosted.fonts.body.source = "https://fonts.googleapis.com/css2?family=Inter";
		const css = buildPreviewCss(hosted, buildResolvedSpec(hosted), "light");
		expect(css).toContain("--font-heading: ");
		expect(css).toContain("--font-body: ");
		expect(css).toContain("--font-mono: ");
		expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter");');
	});

	it("is idempotent", () => {
		const a = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		const b = buildPreviewCss(preset, buildResolvedSpec(preset), "light");
		expect(a).toBe(b);
	});
});

describe("toHex — oklch swatch brightness (defect-11: unitless 0–1 must NOT be /100'd)", () => {
	const channels = (hex: string) =>
		[hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((v) => parseInt(v, 16));

	it("unitless oklch(1 0 0) renders a LIGHT swatch (~#ffffff), not a near-black one", () => {
		expect(toHex("oklch(1 0 0)")).toBe("#ffffff");
	});

	it("unitless oklch(0.15 …) renders DARK (the old /100 made light values dark)", () => {
		const [r, g, b] = channels(toHex("oklch(0.15 0 0)"));
		expect(Math.max(r, g, b)).toBeLessThan(64);
	});

	it("percentage form oklch(100% 0 0) still normalizes to white", () => {
		expect(toHex("oklch(100% 0 0)")).toBe("#ffffff");
	});
});
