import { describe, expect, it } from "vitest";
import { transformCssTs } from "../scripts/codemod";

const SOURCE = `import { tv, type VariantProps } from "tailwind-variants/lite";

export const buttonStyles = tv({
	base: "inline-flex rounded-md text-sm shadow-sm bg-gray-900 text-white",
	variants: {
		size: { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", icon: "size-9" },
	},
	defaultVariants: { size: "default" },
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

	it("adds a size variant when the spec demands it", () => {
		const dialogSource = `import { tv } from "tailwind-variants/lite";
export const dialogStyles = tv({
	slots: {
		content: "fixed w-full max-w-lg rounded-lg p-6",
	},
});`;
		const out = transformCssTs(dialogSource, "dialog", "dialog", ["sm", "lg"]);
		expect(out.code).toContain("size: {");
		expect(out.code).toContain('sm: "max-w-dialog-sm"');
		expect(out.code).toContain('lg: "max-w-dialog-lg"');
	});

	it("reports every substitution", () => {
		const out = transformCssTs(SOURCE, "button", "button");
		expect(out.report.length).toBeGreaterThan(0);
		expect(out.report[0]).toHaveProperty("from");
		expect(out.report[0]).toHaveProperty("to");
	});
});
