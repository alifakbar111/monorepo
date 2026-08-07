import { convertValue, type ValueKind } from "../../../scripts/conversion";

export function Row({
	label,
	value,
	mode,
	kind,
	onValue,
	onToggleMode,
	onInherit,
}: {
	label: string;
	value: string;
	mode: "convert" | "as-is";
	kind: ValueKind;
	onValue: (v: string) => void;
	onToggleMode?: () => void;
	onInherit?: () => void;
}) {
	const resolved = convertValue(value, kind, mode);
	return (
		<div className="preset-row">
			<span className="font-medium">{label}</span>
			<input className="preset-input" value={value} onChange={(e) => onValue(e.target.value)} />
			<div className="flex gap-1">
				{onToggleMode && (
					<button
						className="preset-toggle"
						data-active={mode === "as-is"}
						onClick={onToggleMode}
						title="convert snaps to the nearest Tailwind step; as-is keeps the literal value"
					>
						{mode === "convert" ? "Convert" : "Keep as-is"}
					</button>
				)}
				{onInherit && (
					<button
						className="preset-toggle"
						onClick={onInherit}
						title="stop overriding; inherit from GENERAL"
					>
						↺ inherit
					</button>
				)}
			</div>
			<span className="truncate text-xs text-muted-foreground" title={resolved.display}>
				{resolved.display}
			</span>
			<span className="text-xs">{resolved.snapped ? "⚡" : "🔒"}</span>
		</div>
	);
}
