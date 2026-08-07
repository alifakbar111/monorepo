import type { Preset, TokenValue, RadiusOverride } from "./types";
import { convertValue } from "./conversion";

/**
 * Component name → group. Matches the default preset.json `components` map.
 * All 44 css.ts-bearing components are listed (verified: carousel, chart, spinner,
 * squircle ship no css.ts and are intentionally absent — they are not tokenization targets).
 * heading/text are typography components; form/label are form controls.
 */
export const DEFAULT_GROUP_ASSIGNMENT: Record<string, string> = {
	button: "button",
	input: "input",
	label: "input",
	textarea: "input",
	select: "input",
	checkbox: "input",
	"radio-group": "input",
	switch: "input",
	slider: "input",
	calendar: "input",
	"input-otp": "input",
	form: "input",
	toggle: "input",
	"toggle-group": "input",
	dialog: "overlay",
	"alert-dialog": "overlay",
	drawer: "overlay",
	sheet: "overlay",
	popover: "overlay",
	"dropdown-menu": "overlay",
	"context-menu": "overlay",
	"hover-card": "overlay",
	tooltip: "overlay",
	command: "overlay",
	toast: "overlay",
	card: "card",
	badge: "badge",
	avatar: "badge",
	table: "surface",
	tabs: "surface",
	accordion: "surface",
	alert: "surface",
	skeleton: "surface",
	progress: "surface",
	"scroll-area": "surface",
	resizable: "surface",
	separator: "surface",
	collapsible: "surface",
	"aspect-ratio": "surface",
	breadcrumb: "surface",
	pagination: "surface",
	sidebar: "surface",
	heading: "typography",
	text: "typography",
};

/**
 * Three-tier radius resolver.
 * Returns the effective resolved radius for a COMPONENT:
 *   component `components.<name>.radius`  → wins (component > group)
 *   else group `radiusGroups.<group>`     → wins (group > base)
 *   else INHERIT (the GENERAL base)
 * Each non-inherit resolution carries the token suffix it should emit: `group`
 * for group opt-outs, `components.<name>` for component opt-outs.
 */
export type RadiusResolution =
	| { kind: "inherit" }
	| { kind: "value"; value: TokenValue; token: string }
	| { kind: "shift"; shift: string; token: string };

function resolveOverride(
	override: RadiusOverride,
): { kind: "inherit" } |
	Omit<Extract<RadiusResolution, { kind: "value" }>, "token"> |
	Omit<Extract<RadiusResolution, { kind: "shift" }>, "token"> {
	if (!override) return { kind: "inherit" };
	if ("shift" in override) return { kind: "shift", shift: override.shift };
	return { kind: "value", value: override };
}

export function resolveGroupRadius(
	preset: Preset,
	group: string,
): RadiusResolution {
	const r = resolveOverride(preset.radiusGroups[group]);
	return r.kind === "inherit" ? r : { ...r, token: group };
}

export function resolveComponentRadius(
	preset: Preset,
	name: string,
	group: string,
): RadiusResolution {
	const entry = preset.components[name] as (Preset["components"][string] & { radius?: RadiusOverride }) | undefined;
	if (entry?.radius !== undefined) {
		// component-level override wins — token suffix is the component name
		const r = resolveOverride(entry.radius);
		return r.kind === "inherit" ? r : { ...r, token: name };
	}
	return resolveGroupRadius(preset, group);
}

export type ComponentRadius = {
	group: string;
	radius?: RadiusOverride;
	sizes?: Record<string, { width?: TokenValue }>;
};

/** Resolved per-component spec after three-tier inheritance + conversion. */
export interface ResolvedComponentSpec {
	name: string;
	group: string;
	radius: RadiusResolution;
	/** base radius resolved to its Tailwind class (used for inherit-ers) */
	baseClassName: string;
	sizes: { key: string; widthVar: string; widthValue: string; widthMode: "convert" | "as-is" }[];
}

export function buildResolvedSpec(preset: Preset): ResolvedComponentSpec[] {
	// base radius → its snapped class / value, reused by every inheriting component
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	return Object.entries(preset.components).map(([name, entryRaw]) => {
		const entry = entryRaw as unknown as ComponentRadius;
		const group = entry.group;
		const radius = resolveComponentRadius(preset, name, group);
		// per-component sizes only (group `sizes` is not a schema field); widths resolved
		// THROUGH convertValue per-mode so the codegen + dashboard preview agree by construction
		const sizes = Object.entries(entry.sizes ?? {}).map(([key, s]) => {
			const w = s.width ?? { value: "600px", mode: "convert" as const };
			const resolved = convertValue(w.value, "width", w.mode);
			return {
				key,
				widthVar: `--container-${name}-${key}`,
				widthValue: resolved.value,
				widthMode: w.mode,
			};
		});
		return { name, group, radius, baseClassName: base.className, sizes };
	});
}
