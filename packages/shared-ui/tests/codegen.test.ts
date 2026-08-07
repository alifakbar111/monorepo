import { describe, expect, it } from "vitest";
import { generateColorsCss, generateGlobalCss } from "../scripts/codegen";
import { buildResolvedSpec } from "../scripts/component-map";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";

const preset = presetSchema.parse(
	JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
);
const currentColors = readFileSync(resolve(__dirname, "fixtures/colors.css.golden"), "utf8");
const currentGlobal = readFileSync(resolve(__dirname, "fixtures/global.css.golden"), "utf8");

const themeTokens = (css: string): Set<string> => {
	const re = /(--[a-zA-Z0-9-]+):/g;
	const out = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = re.exec(css))) out.add(m[1]);
	return out;
};

describe("codegen", () => {
	it("colors.css emits every light color var", () => {
		const css = generateColorsCss(preset);
		for (const key of Object.keys(preset.colors.light)) {
			expect(css).toContain(`--${key}: ${preset.colors.light[key]}`);
		}
	});

	it("colors.css dark block is NESTED inside :root — structure matches the golden", () => {
		// Defect-4 regression guard: a bare sibling `&:where([data-theme=...])` inside
		// `@layer utilities` (outside :root) is a dead selector. Snapshoting the WHOLE
		// file byte-for-byte never passes though: `generateColorsCss` omits the golden's
		// `/* Sidebar/Chart/Status colors */` section comments and ADDS preset-owned
		// `--button-default`/`--button-default-foreground` tokens the real file lacks — so
		// a byte-equal `.toBe(currentColors)` is impossible. Compare STRUCTURALLY instead:
		// strip comments + normalize whitespace, then assert the golden's token:value set
		// is a SUBSET of the generated output (nothing dropped, order/padding decoupled).
		const normalize = (css: string) =>
			css
				.replace(/\/\*[\s\S]*?\*\//g, "") // drop `/* … */` section comments
				.replace(/[ \t]+/g, " ") // collapse horizontal whitespace
				.trim();
		const goldenTokens = normalize(currentColors).match(/--[a-z0-9-]+:[^;]+/g) ?? [];
		const generated = normalize(generateColorsCss(preset));
		for (const token of goldenTokens) {
			expect(generated).toContain(token);
		}
		// explicit non-regression: every dark var must appear AFTER :root opens, inside it
		const css = generateColorsCss(preset);
		const inner = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
		expect(inner).toContain('[data-theme="dark"]');
	});

	it("global.css is a SUPERSET of the current @theme token set — nothing dropped", () => {
		const generated = generateGlobalCss(preset, buildResolvedSpec(preset));
		for (const token of themeTokens(currentGlobal)) {
			expect(generated).toContain(`${token}:`);
		}
		// explicit high-value tokens that rounded-md / the base layer rely on (defect 3)
		for (const token of ["--radius", "--radius-sm", "--radius-md", "--radius-lg", "--font-sans", "--color-black", "--spacing", "--sidebar-width", "--animate-accordion-down"]) {
			expect(generated).toContain(token);
		}
	});

	it("per-mode parity: convert saves the SNAPPED value, as-is saves the LITERAL", () => {
		// defect 1: codegen MUST apply convertValue per-mode, or convert/as-is are byte-identical
		const convertPreset = { ...preset, radius: { base: { value: "13px", mode: "convert" as const } } };
		const convert = generateGlobalCss(convertPreset, buildResolvedSpec(convertPreset));
		expect(convert).not.toContain("--radius: 13px");
		expect(convert).toMatch(/--radius: 0\.75rem/);

		const asIsPreset = { ...preset, radius: { base: { value: "13px", mode: "as-is" as const } } };
		const asIs = generateGlobalCss(asIsPreset, buildResolvedSpec(asIsPreset));
		expect(asIs).toContain("--radius: 13px");
		expect(asIs).not.toMatch(/--radius: 0\./);
	});

	it("emits a per-component radius token when a component opts out of its group", () => {
		const presetWithDialog = structuredClone(preset);
		(presetWithDialog.components.dialog as Record<string, unknown>).radius = { value: "2px", mode: "convert" };
		const css = generateGlobalCss(presetWithDialog, buildResolvedSpec(presetWithDialog));
		expect(css).toContain("--radius-dialog");
	});

	it("global.css emits a font @import when a face has a hosted source", () => {
		const hosted = structuredClone(preset);
		hosted.fonts.body.source = "https://fonts.googleapis.com/css2?family=Inter";
		const css = generateGlobalCss(hosted, buildResolvedSpec(hosted));
		expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter");');
		expect(css).toContain("--font-body");
	});

	it("global.css emits @font-face when a face has self-hosted files", () => {
		const selfHosted = structuredClone(preset);
		selfHosted.fonts.body.files = ["fonts/inter-latin.woff2"];
		const css = generateGlobalCss(selfHosted, buildResolvedSpec(selfHosted));
		expect(css).toContain("@font-face");
		expect(css).toContain('url("fonts/inter-latin.woff2")');
	});

	it("global.css contains semantic radius vars from groups, none from inheriting typography", () => {
		const css = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(css).toContain("--radius-button");
		expect(css).toContain("--radius-overlay");
		expect(css).not.toContain("--radius-typography:");
		expect(css).not.toContain("--radius-heading:");
	});

	it("global.css contains type role text vars with line-height", () => {
		const css = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(css).toContain("--text-body");
		expect(css).toContain("--text-body--line-height");
	});

	it("is idempotent — generating twice yields identical output", () => {
		const a = generateGlobalCss(preset, buildResolvedSpec(preset));
		const b = generateGlobalCss(preset, buildResolvedSpec(preset));
		expect(a).toBe(b);
	});
});
