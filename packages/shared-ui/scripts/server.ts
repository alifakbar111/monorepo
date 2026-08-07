import { presetSchema } from "./types";
import { loadPreset, runPipeline, writeTheme, snapshotBackup, restoreBackup, PRESET_PATH } from "./pipeline";
import { writeFileSync } from "node:fs";

export type ApiResponse =
	| { ok: true; preset: import("./types").Preset }
	| { ok: true; report: { changedComponents: string[]; untokenized: string[]; colorsBytes: number; globalBytes: number } }
	| { ok: false; error: string };

export function handleGetPreset(): ApiResponse {
	try {
		return { ok: true, preset: loadPreset() };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

export function handleSave(workingPreset: unknown): ApiResponse {
	const parsed = presetSchema.safeParse(workingPreset);
	if (!parsed.success) {
		return { ok: false, error: "invalid preset: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
	}
	// Defect-8/10 fix: snapshot EVERYTHING (preset.json + colors.css + global.css + all
	// component css.ts) BEFORE any write, so a failed codegen/codemod can be rolled back.
	const snapshot = snapshotBackup();
	try {
		writeFileSync(PRESET_PATH, JSON.stringify(parsed.data, null, "\t") + "\n");
		const result = runPipeline(parsed.data, { applyComponents: true });
		writeTheme(result);
		return {
			ok: true,
			report: {
				changedComponents: result.changedComponents,
				untokenized: result.untokenized,
				colorsBytes: result.colorsCss.length,
				globalBytes: result.globalCss.length,
			},
		};
	} catch (err) {
		const restored = restoreBackup();
		console.error("preset save failed — restored:", restored, err);
		return { ok: false, error: `save failed (rolled back ${restored.length} files): ${err instanceof Error ? err.message : String(err)}` };
	}
}
