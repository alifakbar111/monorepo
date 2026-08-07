import type { Preset } from "../../scripts/types";
import type { ResolvedComponentSpec } from "../../scripts/component-map";
import { convertValue } from "../../scripts/conversion";

/**
 * Builds the live <style> override that makes the gallery react to edits.
 * Mirrors the codegen values exactly (same conversion engine + radius resolver),
 * so preview == saved output.
 */
export function buildPreviewCss(preset: Preset, specs: ResolvedComponentSpec[], theme: "light" | "dark"): string {
	const vars: string[] = [];

	// colors
	for (const [key, value] of Object.entries(preset.colors[theme])) {
		vars.push(`\t--${key}: ${value};`);
	}

	// type roles
	for (const [role, r] of Object.entries(preset.typeRoles)) {
		vars.push(`\t--text-${role}: ${r.size};`);
		vars.push(`\t--text-${role}--line-height: ${r.lineHeight};`);
	}

	// radius — base + per-component/group opt-outs via the SAME three-tier resolution
	// the codegen uses, converting per-mode, so preview == saved output (defect-9).
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	vars.push(`\t--radius: ${base.value};`);
	vars.push(`\t--radius-lg: var(--radius);`);
	vars.push(`\t--radius-md: calc(var(--radius) - 2px);`);
	vars.push(`\t--radius-sm: calc(var(--radius) - 4px);`);
	const emitted = new Set<string>();
	for (const spec of specs) {
		if (spec.radius.kind === "value") {
			// a per-mode conversion here keeps the preview identical to codegen for a
			// given mode; "as-is" radii stay literal so the picker round-trips verbatim
			const rv = convertValue(spec.radius.value.value, "radius", spec.radius.value.mode);
			const key = `--radius-${spec.radius.token}`;
			if (!emitted.has(key)) {
				vars.push(`\t${key}: ${rv.value};`);
				emitted.add(key);
			}
		} else if (spec.radius.kind === "shift") {
			const key = `--radius-${spec.radius.token}`;
			if (!emitted.has(key)) {
				vars.push(`\t${key}: calc(var(--radius) + ${spec.radius.shift});`);
				emitted.add(key);
			}
		}
	}

	// component sizes — widthValue is ALREADY resolved per-mode by buildResolvedSpec
	// (same convertValue path as codegen containers) — emit it verbatim
	for (const spec of specs) {
		for (const sz of spec.sizes) {
			vars.push(`\t--container-${spec.name}-${sz.key}: ${sz.widthValue};`);
		}
	}

	// fonts — family vars + hosted @import (self-hosted woff2 resolved via Vite in dev)
	const hostedImports = [...new Set([preset.fonts.heading.source, preset.fonts.body.source, preset.fonts.mono.source].filter((s): s is string => !!s))]
		.map((url) => `@import url("${url}");`)
		.join("");
	vars.push(`\t--font-heading: ${preset.fonts.heading.family};`);
	vars.push(`\t--font-body: ${preset.fonts.body.family};`);
	vars.push(`\t--font-sans: ${preset.fonts.body.family};`);
	vars.push(`\t--font-mono: ${preset.fonts.mono.family};`);
	for (const [k, v] of Object.entries(preset.shadow)) vars.push(`\t--shadow-${k}: ${v};`);
	for (const [k, v] of Object.entries(preset.animation.duration)) vars.push(`\t--duration-${k}: ${v};`);
	for (const [k, v] of Object.entries(preset.animation.easing)) vars.push(`\t--ease-${k}: ${v};`);

	return `${hostedImports}\n:root {\n${vars.join("\n")}\n}`;
}
