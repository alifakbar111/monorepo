import { loadPreset, runPipeline, writeTheme, snapshotBackup, restoreBackup } from "./pipeline";

const snapshot = snapshotBackup(); // snapshot ALL css.ts + theme files first
const preset = loadPreset();
// roll back on failure — runPipeline INCLUDES the codemod, which writes component
// css.ts files; wrap BOTH the codemod writes AND writeTheme so any throw anywhere
// restores every backed-up file (mirrors the dashboard/server path). `result` is
// produced inside the guarded region so the report below can read it either way.
const result = (() => {
	try {
		const r = runPipeline(preset, { applyComponents: true });
		writeTheme(r);
		return r;
	} catch (err) {
		const restored = restoreBackup();
		console.error("preset:codemod — FAILED, restored:", restored);
		throw err;
	}
})();
console.log("preset:codemod — components tokenized.");
console.log(`  changed: ${result.changedComponents.length > 0 ? result.changedComponents.join(", ") : "(none)"}`);
if (result.untokenized.length > 0) {
	console.warn("  UNTOKENIZED (review before shipping):");
	for (const u of result.untokenized) console.warn(`    ${u}`);
}
