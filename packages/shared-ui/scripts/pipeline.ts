import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { presetSchema, type Preset } from "./types";
import { buildResolvedSpec, type ResolvedComponentSpec } from "./component-map";
import { generateColorsCss, generateGlobalCss } from "./codegen";
import { runCodemod } from "./codemod";

export interface PipelineResult {
	colorsCss: string;
	globalCss: string;
	specs: ResolvedComponentSpec[];
	changedComponents: string[];
	untokenized: string[];
}

export const PRESET_PATH = resolve("src/theme/preset.json");
export const COLORS_PATH = resolve("src/styles/colors.css");
export const GLOBAL_CSS_PATH = resolve("src/styles/global.css");
export const BACKUP_DIR = resolve("src/theme/.backup");

export function loadPreset(): Preset {
	return presetSchema.parse(JSON.parse(readFileSync(PRESET_PATH, "utf8")));
}

/**
 * Snapshot EVERY file the pipeline may write — the theme files PLUS every component
 * `*.css.ts` — before ANY write.*. Defect-10 fix: without this, a bad codemod or an
 * interrupt mid-write could not be rolled back; the backup must exist first.
 */
export function snapshotBackup(): string[] {
	mkdirSync(BACKUP_DIR, { recursive: true });
	const copied: string[] = [];
	const themeFiles: readonly (readonly [string, string])[] = [
		[PRESET_PATH, "preset.json"],
		[COLORS_PATH, "colors.css"],
		[GLOBAL_CSS_PATH, "global.css"],
	];
	for (const [src, name] of themeFiles) {
		if (existsSync(src)) {
			copyFileSync(src, join(BACKUP_DIR, name));
			copied.push(name);
		}
	}
	// every component css.ts, mirrored under .backup/components/<dir>/<dir>.css.ts
	const componentsDir = resolve("src/components");
	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const src = resolve(componentsDir, dir.name, `${dir.name}.css.ts`);
		if (!existsSync(src)) continue; // e.g. carousel/chart/spinner/squircle have no css.ts
		const rel = join("components", dir.name, `${dir.name}.css.ts`);
		const dest = join(BACKUP_DIR, rel);
		mkdirSync(dirname(dest), { recursive: true });
		copyFileSync(src, dest);
		copied.push(rel);
	}
	return copied;
}

/** Restore the backup (rollback on failure). Returns the list of restored files. */
export function restoreBackup(): string[] {
	const restored: string[] = [];
	for (const src of [PRESET_PATH, COLORS_PATH, GLOBAL_CSS_PATH]) {
		const name = basename(src);
		if (!existsSync(join(BACKUP_DIR, name))) continue;
		writeFileSync(src, readFileSync(join(BACKUP_DIR, name)));
		restored.push(name);
	}
	const componentsDir = resolve("src/components");
	for (const dir of readdirSync(componentsDir, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		const rel = join("components", dir.name, `${dir.name}.css.ts`);
		const backup = join(BACKUP_DIR, rel);
		if (!existsSync(backup)) continue;
		writeFileSync(resolve(dirname(componentsDir), rel), readFileSync(backup));
		restored.push(rel);
	}
	return restored;
}

export function runPipeline(preset: Preset, { applyComponents }: { applyComponents: boolean }): PipelineResult {
	const specs = buildResolvedSpec(preset);
	const colorsCss = generateColorsCss(preset);
	const globalCss = generateGlobalCss(preset, specs);
	let changedComponents: string[] = [];
	let untokenized: string[] = [];
	if (applyComponents) {
		const res = runCodemod({ componentsDir: resolve("src/components"), preset });
		changedComponents = res.changedFiles;
		untokenized = res.untokenizedFiles;
	}
	return { colorsCss, globalCss, specs, changedComponents, untokenized };
}

export function writeTheme(result: PipelineResult) {
	writeFileSync(COLORS_PATH, result.colorsCss);
	writeFileSync(GLOBAL_CSS_PATH, result.globalCss);
}
