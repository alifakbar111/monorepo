import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset } from "../../../scripts/types";

export function GeneralPanel({ preset }: { preset: Preset | null }) {
	if (!preset) return null;
	// narrowed copy — TS does not carry the guard's narrowing into closures
	const current = preset;
	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(current);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}
	return (
		<aside className="preset-sidebar w-72 shrink-0 overflow-y-auto border-r border-border p-3">
			<div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				GENERAL — applies to all
			</div>

			<h5 className="mt-3 text-xs font-semibold">Fonts</h5>
			<select
				className="preset-input mb-1"
				onChange={(e) => {
					const url = e.target.value;
					if (!url) return;
					const FAMILIES: Record<string, { family: string; source: string }> = {
						Inter: { family: '"Inter", ui-sans-serif, system-ui, sans-serif', source: "https://fonts.googleapis.com/css2?family=Inter:wght@400..600" },
						Sora: { family: '"Sora", ui-sans-serif, system-ui, sans-serif', source: "https://fonts.googleapis.com/css2?family=Sora:wght@400..800" },
						"JetBrains Mono": { family: '"JetBrains Mono", ui-monospace, monospace', source: "https://fonts.googleapis.com/css2?family=JetBrains+Mono" },
					};
					const fam = FAMILIES[e.target.value];
					if (fam) patch((p) => void Object.assign(p.fonts.body, fam));
				}}
			>
				<option value="">Quick pick (fill body)…</option>
				{["Inter", "Sora", "JetBrains Mono"].map((f) => <option key={f} value={f}>{f}</option>)}
			</select>
			{(["heading", "body", "mono"] as const).map((face) => (
				<fieldset key={face} className="mb-2 border border-border rounded-md p-2">
					<legend className="px-1 text-[11px] font-semibold uppercase text-muted-foreground">{face}</legend>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>family</span>
						<input className="preset-input" value={preset.fonts[face].family} onChange={(e) => patch((p) => void (p.fonts[face].family = e.target.value))} />
					</label>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>URL</span>
						<input className="preset-input" placeholder="https://fonts.google… (hosted)" value={preset.fonts[face].source ?? ""} onChange={(e) => patch((p) => void (p.fonts[face].source = e.target.value || null))} />
					</label>
					<label className="preset-row" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
						<span>files</span>
						<input className="preset-input" placeholder="fonts/inter-latin.woff2 (self-hosted)" value={(preset.fonts[face].files ?? []).join(", ")} onChange={(e) => patch((p) => void (p.fonts[face].files = e.target.value ? e.target.value.split(",").map((s) => s.trim()) : null))} />
					</label>
				</fieldset>
			))}

			<h5 className="mt-3 text-xs font-semibold">Corner radius — base</h5>
			<label className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
				<span>base</span>
				<input className="preset-input" value={preset.radius.base.value} onChange={(e) => patch((p) => void (p.radius.base.value = e.target.value))} />
			</label>

			<h5 className="mt-3 text-xs font-semibold">Type roles</h5>
			{Object.entries(preset.typeRoles).map(([role, r]) => (
				<div key={role} className="preset-row" style={{ gridTemplateColumns: "6rem 4rem 4rem 4rem" }}>
					<span>{role}</span>
					<input className="preset-input" value={r.size} onChange={(e) => patch((p) => void (p.typeRoles[role].size = e.target.value))} />
					<input className="preset-input" value={r.lineHeight} onChange={(e) => patch((p) => void (p.typeRoles[role].lineHeight = e.target.value))} />
					<input className="preset-input" value={r.weight} onChange={(e) => patch((p) => void (p.typeRoles[role].weight = e.target.value))} />
				</div>
			))}

			<h5 className="mt-3 text-xs font-semibold">Breakpoints</h5>
			{Object.entries(preset.breakpoints).map(([bp, value]) => (
				<label key={bp} className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
					<span>{bp}</span>
					<input className="preset-input" value={value} onChange={(e) => patch((p) => void (p.breakpoints[bp] = e.target.value))} />
				</label>
			))}

			<h5 className="mt-3 text-xs font-semibold">Durations</h5>
			{Object.entries(preset.animation.duration).map(([k, value]) => (
				<label key={k} className="preset-row" style={{ gridTemplateColumns: "4rem 1fr" }}>
					<span>{k}</span>
					<input className="preset-input" value={value} onChange={(e) => patch((p) => void (p.animation.duration[k] = e.target.value))} />
				</label>
			))}
		</aside>
	);
}
