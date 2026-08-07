import { useStore } from "@nanostores/react";
import { dirty, saving } from "../store";

export function Toolbar({
	theme,
	onToggleTheme,
	onSave,
	onReset,
}: {
	theme: "light" | "dark";
	onToggleTheme: () => void;
	onSave: () => void;
	onReset: () => void;
}) {
	const isDirty = useStore(dirty);
	const isSaving = useStore(saving);
	return (
		<header className="flex h-12 items-center gap-3 border-b border-border px-4">
			<span className="text-sm font-semibold">Shared UI — Design Preset</span>
			<span className="text-xs text-muted-foreground">{isDirty ? "● unsaved changes" : "saved"}</span>
			<div className="ml-auto flex items-center gap-2">
				<button
					className="preset-toggle"
					onClick={onToggleTheme}
					title="toggle light/dark preview"
				>
					{theme === "light" ? "◐ dark" : "◑ light"}
				</button>
				<button className="preset-toggle" onClick={onReset} title="reset to last saved state">
					↺ reset
				</button>
				<button
					className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
					onClick={onSave}
					disabled={!isDirty || isSaving}
				>
					{isSaving ? "Saving…" : "Save"}
				</button>
			</div>
		</header>
	);
}
