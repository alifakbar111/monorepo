import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { presetSchema } from "../scripts/types";

describe("preset.json", () => {
	it("parses against the schema", () => {
		const raw = readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8");
		const result = presetSchema.safeParse(JSON.parse(raw));
		expect(result.success).toBe(true);
		if (!result.success) console.error(result.error.format());
	});

	it("has light and dark color sets with the same keys", () => {
		const raw = readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8");
		const preset = presetSchema.parse(JSON.parse(raw));
		expect(Object.keys(preset.colors.light).toSorted()).toEqual(
			Object.keys(preset.colors.dark).toSorted(),
		);
	});
});
