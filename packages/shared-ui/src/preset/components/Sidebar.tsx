import { useStore } from "@nanostores/react";
import { workingPreset } from "../store";
import { GROUPS, COMPONENT_GROUP } from "../groups";

export function Sidebar({
	selection,
	onSelect,
}: {
	selection: string;
	onSelect: (id: string) => void;
}) {
	const preset = useStore(workingPreset);
	const byGroup: Record<string, string[]> = {};
	if (preset) {
		for (const name of Object.keys(preset.components)) {
			const g = COMPONENT_GROUP[name] ?? "surface";
			(byGroup[g] ??= []).push(name);
		}
	}
	// group-level radius override: radiusGroups[g] exists and is a concrete value/shift (not null/absent)
	const groupOverridden = (g: string) => {
		const gr = preset?.radiusGroups[g];
		return gr != null && ("shift" in gr || "value" in gr);
	};
	// per-component radius override: components.<name>.radius exists (three-tier, beats the group)
	const componentOverridden = (name: string) => {
		const entry = preset?.components[name] as { radius?: unknown } | undefined;
		return entry?.radius !== undefined;
	};
	return (
		<nav className="preset-sidebar w-56 shrink-0 overflow-y-auto border-l border-border p-2">
			<div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				COMPONENTS
			</div>
			{GROUPS.map((section) => (
				<div key={section.id} className="mt-3">
					<button
						className="preset-item w-full text-left font-medium"
						data-active={selection === section.id}
						onClick={() => onSelect(section.id)}
					>
						<span>{groupOverridden(section.id) ? "● " : ""}{section.label}</span>
					</button>
					{(byGroup[section.id] ?? []).toSorted().map((name) => (
						<button
							key={name}
							className="preset-item w-full pl-5 text-left"
							data-active={selection === name}
							onClick={() => onSelect(name)}
						>
							{componentOverridden(name) ? "● " : ""}
							{name}
						</button>
					))}
				</div>
			))}
		</nav>
	);
}
