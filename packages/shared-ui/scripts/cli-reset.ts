import { restoreBackup } from "./pipeline";

const restored = restoreBackup();
if (restored.length === 0) {
	console.error("preset:reset — no backup found. Restore from git instead.");
	process.exit(1);
}
console.log(`preset:reset — restored ${restored.length} file(s) from .backup/:`);
for (const f of restored) console.log(`  ${f}`);
