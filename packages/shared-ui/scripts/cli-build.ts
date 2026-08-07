import { loadPreset, runPipeline, writeTheme, snapshotBackup } from "./pipeline";

// snapshot FIRST, write SECOND — nothing is ever written without a backup in place
const snapshot = snapshotBackup();
const preset = loadPreset();
const result = runPipeline(preset, { applyComponents: false });
writeTheme(result);
console.log("preset:build — theme written.");
console.log(`  snapshot: ${snapshot.length} files backed up to src/theme/.backup/`);
console.log(`  colors.css: ${result.colorsCss.length} bytes`);
console.log(`  global.css: ${result.globalCss.length} bytes`);
for (const u of result.untokenized) console.log(`  UNTOKENIZED: ${u}`);
