import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { untokenizedClasses } from "./codemod";
import { COMPONENTS_DIR } from "./pipeline";

// preset:check — default is WARN (report only, exit 0). --strict makes it fail,
// for use in CI where untokenized classes must block the merge.
const strict = process.argv.includes("--strict");
const componentsDir = COMPONENTS_DIR;
const offenders: string[] = [];
for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
	if (!dir.isDirectory()) continue;
	const file = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
	try {
		const text = readFileSync(file, "utf8");
		const found = untokenizedClasses(text);
		if (found.length > 0) offenders.push(`${dir.name}.css.ts: ${found.join(", ")}`);
	} catch {
		// no css.ts for this component dir (e.g. carousel/chart/spinner/squircle) — skip
	}
}
if (offenders.length > 0) {
	const msg = `preset:check — untokenized classes found (${offenders.length}):\n${offenders.map((o) => `  ${o}`).join("\n")}\nRun preset:codemod.`;
	if (strict) {
		console.error(msg);
		process.exit(1);
	}
	console.warn(msg);
} else {
	console.log("preset:check — all components tokenized.");
}
