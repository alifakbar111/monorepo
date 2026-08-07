import type { Preset } from "../../scripts/types";

export interface SaveReport {
	changedComponents: string[];
	untokenized: string[];
	colorsBytes: number;
	globalBytes: number;
}

export async function fetchPreset(): Promise<Preset> {
	const res = await fetch("/api/preset");
	const json = await res.json();
	if (!json.ok) throw new Error(json.error);
	return json.preset as Preset;
}

export async function savePreset(preset: Preset): Promise<SaveReport> {
	const res = await fetch("/api/preset", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(preset),
	});
	const json = await res.json();
	if (!json.ok) throw new Error(json.error);
	return json.report as SaveReport;
}
