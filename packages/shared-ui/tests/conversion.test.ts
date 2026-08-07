import { describe, expect, it } from "vitest";
import { convertValue } from "../scripts/conversion";

describe("convertValue — snap to nearest Tailwind step", () => {
	it("maps 1200px width to the nearest container step (max-w-6xl, 72rem)", () => {
		const r = convertValue("1200px", "width", "convert");
		expect(r.className).toBe("max-w-6xl");
		expect(r.display).toContain("72rem");
	});

	it("maps 600px width to max-w-xl (36rem)", () => {
		expect(convertValue("600px", "width", "convert").className).toBe("max-w-xl");
	});

	it("maps 13px radius to rounded-xl (0.75rem)", () => {
		expect(convertValue("13px", "radius", "convert").className).toBe("rounded-xl");
	});

	it("maps 40px height to h-10", () => {
		expect(convertValue("40px", "height", "convert").className).toBe("h-10");
	});

	it("maps 16px spacing-x to px-4", () => {
		expect(convertValue("16px", "spacing-x", "convert").className).toBe("px-4");
	});

	it("maps 600 font-weight to font-semibold", () => {
		expect(convertValue("600", "font-weight", "convert").className).toBe("font-semibold");
	});

	it("keeps rem values verbatim when snapping is within the scale", () => {
		expect(convertValue("0.875rem", "font-size", "convert").className).toBe("text-sm");
	});

	it("handles as-is mode by emitting a var reference, not an arbitrary class", () => {
		const r = convertValue("13px", "radius", "as-is");
		expect(r.value).toBe("13px");
		expect(r.varName).toBe("radius");
	});
});

describe("convertValue — as-is keeps literal value", () => {
	it("never snaps a pixel-perfect value", () => {
		const r = convertValue("1200px", "width", "as-is");
		expect(r.value).toBe("1200px");
	});
});
