import { describe, expect, it } from "vitest";
import { tv } from "tailwind-variants/lite";
import { transformCssTs } from "../scripts/codemod";

const SOURCE = `import { tv, type VariantProps } from "tailwind-variants/lite";

export const buttonStyles = tv({
	base: "inline-flex rounded-md text-sm shadow-sm bg-gray-900 text-white",
	variants: {
		size: { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", icon: "size-9" },
	},
	defaultVariants: { size: "default" },
});`;

const DIALOG_SOURCE = `import { tv } from "tailwind-variants/lite";
export const dialogStyles = tv({
	slots: {
		content: "fixed w-full max-w-lg rounded-lg p-6",
	},
});`;

describe("transformCssTs", () => {
	it("tokenizes radius (group opt-out), text and color classes", () => {
		const out = transformCssTs(SOURCE, "button", "button"); // button opts out → rounded-button
		expect(out.code).toContain("rounded-button");
		expect(out.code).toContain("text-body");
		expect(out.code).not.toContain("rounded-md");
		expect(out.code).toContain("bg-button-default text-button-default-foreground");
		expect(out.code).toContain("shadow-sm");
	});

	it("tokenizes an inheriting component to the plain rounded", () => {
		const out = transformCssTs(SOURCE, "table", "inherit"); // surface inherits → rounded
		expect(out.code).toContain("rounded");
		expect(out.code).toContain("text-body");
		expect(out.code).not.toContain("rounded-md");
	});

	it("emits a per-component radius token when the component overrides its group", () => {
		// three-tier: component > group > base — an override on dialog wins over the overlay group
		const out = transformCssTs(SOURCE, "dialog", "dialog");
		expect(out.code).toContain("rounded-dialog");
		expect(out.code).not.toContain("rounded-overlay");
	});

	it("is idempotent", () => {
		const once = transformCssTs(SOURCE, "button", "button");
		const twice = transformCssTs(once.code, "button", "button");
		expect(twice.code).toBe(once.code);
	});

	it("adds a slot-scoped size variant + defaultVariants when the spec demands it", () => {
		const out = transformCssTs(DIALOG_SOURCE, "dialog", "dialog", ["sm", "lg"]);
		expect(out.code).toContain("size: {");
		// slot-scoped form — string values would be silently dropped by tv() slots
		expect(out.code).toContain("sm: { content: 'max-w-dialog-sm' }");
		expect(out.code).toContain("lg: { content: 'max-w-dialog-lg' }");
		// defaultVariants.size = first size key so callers without a size still get a width
		expect(out.code).toContain("defaultVariants: { size: 'sm' }");
	});

	it("size variant is functional at runtime (slot-scoped, not inert)", () => {
		const out = transformCssTs(DIALOG_SOURCE, "dialog", "dialog", ["sm", "lg"]);
		// evaluate the transformed tv() config against the real tailwind-variants
		const runtimeCode = out.code.replace(/import[^;]*;/, "").replace("export const", "const");
		const dialogStyles = new Function("tv", `${runtimeCode}\nreturn dialogStyles;`)(tv) as any;
		expect(dialogStyles({ size: "sm" }).content()).toContain("max-w-dialog-sm");
		expect(dialogStyles({ size: "lg" }).content()).toContain("max-w-dialog-lg");
		// defaultVariants.size = "sm" applies when no size is passed
		expect(dialogStyles().content()).toContain("max-w-dialog-sm");
	});

	it("re-tokenizes a bare `rounded` on an opt-out component", () => {
		const src = `import { tv } from "tailwind-variants/lite";
export const x = tv({ base: "inline-flex rounded text-sm" });`;
		const out = transformCssTs(src, "button", "button");
		expect(out.code).toContain("rounded-button");
		expect(out.code).not.toContain('" rounded');
	});

	it("de-tokenizes a stale rounded-<group> on an inheriting component", () => {
		const src = `import { tv } from "tailwind-variants/lite";
export const x = tv({ base: "rounded-overlay border" });`;
		const out = transformCssTs(src, "table", "inherit");
		expect(out.code).toContain("rounded border");
		expect(out.code).not.toContain("rounded-overlay");
	});

	it("re-tokenization is idempotent across transitions", () => {
		const src = `import { tv } from "tailwind-variants/lite";
export const x = tv({ base: "inline-flex rounded text-sm" });`;
		const once = transformCssTs(src, "button", "button");
		expect(once.code).toContain("rounded-button");
		const twice = transformCssTs(once.code, "button", "button");
		expect(twice.code).toBe(once.code);
	});

	it("keeps rounded-full untouched", () => {
		const src = `import { tv } from "tailwind-variants/lite";
export const x = tv({ base: "rounded-full" });`;
		const out = transformCssTs(src, "badge", "badge");
		expect(out.code).toContain("rounded-full");
	});

	it("reports every substitution", () => {
		const out = transformCssTs(SOURCE, "button", "button");
		expect(out.report.length).toBeGreaterThan(0);
		expect(out.report[0]).toHaveProperty("from");
		expect(out.report[0]).toHaveProperty("to");
	});
});
