import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleSave, handleGetPreset } from "../scripts/server";
import { presetSchema } from "../scripts/types";

describe("preset server handlers", () => {
	it("GET returns the current preset.json", () => {
		const res = handleGetPreset();
		expect(res.ok).toBe(true);
		if (res.ok && "preset" in res) expect(res.preset.info).toHaveProperty("name");
	});

	it("POST save rejects an invalid preset", () => {
		const res = handleSave({ info: { name: "x" } } as never);
		expect(res.ok).toBe(false);
		if (!res.ok) expect(res.error).toBeTruthy();
	});

	it("POST save accepts a valid preset and returns a report", () => {
		// load the real default preset so the save round-trips a VALID shape
		const valid = presetSchema.parse(
			JSON.parse(readFileSync(resolve(__dirname, "../src/theme/preset.json"), "utf8")),
		);
		const res = handleSave(valid);
		expect(res.ok).toBe(true);
		if (res.ok && "report" in res) expect(res.report).toBeDefined();
	});
});
