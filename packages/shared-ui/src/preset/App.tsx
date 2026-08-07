import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { fetchPreset, savePreset } from "./api";
import { workingPreset, dirty, saving, lastReport, previewStyle, setPreset } from "./store";
import { buildPreviewCss } from "./preview";
import { buildResolvedSpec } from "../../scripts/component-map";
import { Toolbar } from "./components/Toolbar";
import { GeneralPanel } from "./components/GeneralPanel";
import { Sidebar } from "./components/Sidebar";
import { Gallery } from "./components/Gallery";
import { TokenPanel } from "./components/TokenPanel";
import { SpecPanel } from "./components/SpecPanel";
import { GROUPS, COMPONENT_GROUP } from "./groups";
import type { Preset } from "../../scripts/types";

/** The bottom spec sheet shows the focused component — an explicitly selected one,
 *  or the first member of the selected group (deterministic, sorted). */
function focusComponent(selection: string, preset: Preset | null): string {
	if (selection && !GROUPS.some((g) => g.id === selection) && preset?.components[selection]) {
		return selection;
	}
	const members = Object.keys(preset?.components ?? {}).filter((n) => COMPONENT_GROUP[n] === selection);
	return members.toSorted()[0] ?? "";
}

export function App() {
	const preset = useStore(workingPreset);
	const preview = useStore(previewStyle);
	const isSaving = useStore(saving);
	const report = useStore(lastReport);
	const [selection, setSelection] = useState(""); // "" = token/general gallery, else component name
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);

	useEffect(() => {
		fetchPreset().then((p) => setPreset(p)).catch(console.error);
	}, []);

	// reactive preview: rebuild the override whenever the working preset changes
	useEffect(() => {
		if (!preset) return;
		const specs = buildResolvedSpec(preset);
		previewStyle.set(buildPreviewCss(preset, specs, theme));
	}, [preset, theme]);

	async function handleSave() {
		if (!preset) return;
		saving.set(true);
		try {
			// The server snapshots BEFORE writing (preset.json + colors.css + global.css +
			// all component css.ts) and rolls back on failure — the dashboard only reports.
			const sent = preset; // the exact object snapshot being saved
			const r = await savePreset(preset);
			lastReport.set({ changed: r.changedComponents.length, untokenized: r.untokenized, bytes: r.colorsBytes + r.globalBytes });
			// only clear dirty if nothing changed since the save snapshot — edits made
			// while the save was in flight must not be clobbered (identity compare works:
			// every edit replaces the object via structuredClone)
			if (workingPreset.get() === sent) dirty.set(false);
		} catch (e) {
			// server already restored the previous state; keep editing the in-memory preset
			console.error("save failed (state restored server-side):", e);
			lastReport.set({ changed: 0, untokenized: ["save failed — previous state restored"], bytes: 0 });
		} finally {
			saving.set(false);
		}
	}

	function handleReset() {
		fetchPreset().then((p) => setPreset(p)).catch(console.error);
	}

	return (
		<div className="preset-app flex h-screen flex-col">
			<style id="preset-preview">{preview}</style>
			<Toolbar theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")} onSave={handleSave} onReset={handleReset} />
			<div className="flex min-h-0 flex-1">
				{/* LEFT — GENERAL (Design Tokens): applies to all components */}
				<GeneralPanel preset={preset} />
				{/* CENTER: canvas + bottom spec sheet */}
				<main className="flex min-w-0 flex-1 flex-col">
					<Gallery selection={selection} />
					{focusComponent(selection, preset) ? (
						<SpecPanel componentName={focusComponent(selection, preset)} />
					) : (
						<TokenPanel />
					)}
					{report && (
						<div className="border-t border-border px-4 py-1 text-xs text-muted-foreground">
							Saved: {report.changed} components rewritten, {report.bytes} bytes of theme CSS.
							{report.untokenized.length > 0 && ` UNTOKENIZED: ${report.untokenized.join(", ")}`}
						</div>
					)}
				</main>
				{/* RIGHT: component groups list */}
				<Sidebar selection={selection} onSelect={setSelection} />
			</div>
		</div>
	);
}
