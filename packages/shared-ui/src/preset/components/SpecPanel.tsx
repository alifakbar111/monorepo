import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset, RadiusOverride } from "../../../scripts/types";
import { COMPONENT_GROUP } from "../groups";
import { Row } from "./Row";

type CompEntry = Preset["components"][string] & {
	radius?: { value: string; mode: "convert" | "as-is" } | { shift: string };
	sizes?: Record<string, { width?: { value: string; mode: "convert" | "as-is" } }>;
};

export function SpecPanel({ componentName }: { componentName: string }) {
	const preset = useStore(workingPreset);
	if (!preset) return null;
	// narrowed copy — TS does not carry the guard's narrowing into closures
	const current = preset;
	const group = COMPONENT_GROUP[componentName] ?? "surface";
	const entry = preset.components[componentName] as CompEntry | undefined;
	const compRadius = entry?.radius;
	const groupRadius = preset.radiusGroups[group] as RadiusOverride | undefined;

	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(current);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}

	function ensureEntry(): boolean {
		if (!current.components[componentName]) {
			patch((p) => {
				(p.components[componentName] as Record<string, unknown>) = { group };
			});
		}
		return true;
	}

	// three-tier resolution: component radius wins, else group radius, else GENERAL base
	const source =
		compRadius !== undefined ? "component" :
		groupRadius != null ? "group" :
		"general";

	return (
		<div className="max-h-72 overflow-y-auto border-t border-border bg-background">
			<div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				<span>{componentName} · group: {group}</span>
				{source === "component" && <span className="text-primary">● component override</span>}
				{source === "group" && <span className="text-primary">● group override</span>}
				{source === "general" && <span>↺ inherits GENERAL radius</span>}
				{!entry && <span> · not yet adopted — inherits group defaults</span>}
			</div>

			{/* radius — the selected component's OWN override (or inherit). Editing here
			    only writes components.<name>.radius — sibling components are untouched. */}
			{compRadius && "value" in compRadius ? (
				<Row
					label="radius (own override)"
					value={compRadius.value}
					mode={compRadius.mode}
					kind="radius"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: v, mode: compRadius.mode }))}
					onToggleMode={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: compRadius.value, mode: compRadius.mode === "convert" ? "as-is" : "convert" }))}
					onInherit={() => patch((p) => void delete (p.components[componentName] as CompEntry).radius)}
				/>
			) : compRadius && "shift" in compRadius ? (
				<Row
					label="radius (own shift)"
					value={compRadius.shift}
					mode="as-is"
					kind="radius"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { shift: v }))}
					onInherit={() => patch((p) => void delete (p.components[componentName] as CompEntry).radius)}
				/>
			) : (
				<div className="preset-row">
					<span className="font-medium">radius</span>
					<span className="text-xs text-muted-foreground">
						{source === "group"
							? `inherits group ${group} (${"value" in groupRadius! ? groupRadius.value : "base + " + groupRadius!.shift})`
							: `inherits GENERAL base (${preset.radius.base.value})`}
					</span>
					<button className="preset-toggle" onClick={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { value: preset.radius.base.value, mode: "convert" }))}>
						✎ set own value (component override)
					</button>
					<button className="preset-toggle" onClick={() => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).radius = { shift: "2px" }))}>
						✎ shift from base
					</button>
				</div>
			)}

			{Object.entries(entry?.sizes ?? {}).map(([sizeKey, size]) => (
				<Row
					key={sizeKey}
					label={`size.${sizeKey} · width`}
					value={size.width?.value ?? "600px"}
					mode={size.width?.mode ?? "convert"}
					kind="width"
					onValue={(v) => ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).sizes![sizeKey] = { width: { value: v, mode: size.width?.mode ?? "convert" } }))}
					onToggleMode={() =>
						ensureEntry() && patch((p) => void ((p.components[componentName] as CompEntry).sizes![sizeKey] = { width: { value: size.width?.value ?? "600px", mode: size.width?.mode === "convert" ? "as-is" : "convert" } }))
					}
				/>
			))}
			{!entry?.sizes && (
				<button
					className="preset-toggle m-3"
					onClick={() =>
						ensureEntry() && patch((p) => {
							(p.components[componentName] as CompEntry).sizes = { sm: { width: { value: "600px", mode: "convert" } } };
						})
					}
				>
					+ add size variant
				</button>
			)}
		</div>
	);
}
