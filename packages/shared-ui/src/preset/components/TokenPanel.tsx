import { useStore } from "@nanostores/react";
import { workingPreset, dirty } from "../store";
import type { Preset } from "../../../scripts/types";

export function TokenPanel() {
	const preset = useStore(workingPreset);
	if (!preset) return null;

	// narrowed copy — TS does not carry the guard's narrowing into closures
	const current = preset;
	function patch(fn: (p: Preset) => void) {
		const next = structuredClone(current);
		fn(next);
		workingPreset.set(next);
		dirty.set(true);
	}

	const section = (theme: "light" | "dark") => (
		<section>
			<h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
				Colors — {theme}
			</h4>
			{Object.entries(preset.colors[theme]).map(([key, value]) => (
				<label key={key} className="preset-row" style={{ gridTemplateColumns: "11rem 8rem" }}>
					<span>{key}</span>
					<input
						type="color"
						className="h-7 w-10 cursor-pointer rounded-sm border border-input"
						value={toHex(value)}
						onChange={(e) =>
							patch((p) => {
								// Defect-9 fix: NEVER write a hex back into preset.json — the preset
								// stores oklch verbatim. The input shows a derived hex; on change the
								// picked hex is converted -> oklch so the stored value round-trips.
								p.colors[theme][key] = toOklch(e.target.value);
							})
						}
					/>
				</label>
			))}
		</section>
	);

	return (
		<div className="max-h-72 overflow-y-auto border-t border-border bg-background">
			<div className="flex flex-wrap gap-6 p-3">
				{section("light")}
				{section("dark")}
			</div>
		</div>
	);
}

/** color input needs hex; derive a best-effort hex from any stored color (oklch/rgb). */
export function toHex(value: string): string {
	if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
	try {
		const m = /^oklch\(([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/.exec(value);
		if (m) {
			// Defect-11 fix: CSS oklch components are 0–1 UNLESS they carry a `%` sign.
			// The old `parseFloat / 100` unconditionally shrank unitless values, so
			// `oklch(1 0 0)` (white) rendered as l=0.01 → a near-black swatch. Normalize
			// only the 0–100 percentage form; unitless 0–1 is used directly.
			const to01 = (s: string) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));
			const l = to01(m[1]);
			const c = to01(m[2]);
			const h = (parseFloat(m[3]) * Math.PI) / 180;
			return rgbToHex(oklchToSrgb(l, c, h));
		}
		const rgb = /^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value);
		if (rgb) {
			const [r, g, b] = [1, 2, 3].map((i) => parseFloat(rgb[i]) / 255);
			return rgbToHex({ r, g, b });
		}
	} catch {
		/* fall through */
	}
	return "#808080"; // unparseable — mid gray swatch; the stored value is untouched
}

/** oklab -> linear sRGB (CSS Color 4 matrices), then to sRGB for the swatch. */
function oklchToSrgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
	const a = c * Math.cos(h);
	const b = c * Math.sin(h);
	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;
	const lr = l_ ** 3, mr = m_ ** 3, sr = s_ ** 3;
	const r = 4.0767416621 * lr - 3.3077115913 * mr + 0.2309699292 * sr;
	const g = -1.2684380046 * lr + 2.6097574011 * mr - 0.3413193965 * sr;
	const bl = -0.0041960863 * lr - 0.7034186147 * mr + 1.707614701 * sr;
	const d = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
	return { r: d(r), g: d(g), b: d(bl) };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
	const to255 = (v: number) => Math.round(Math.min(255, Math.max(0, v * 255)));
	return `#${[r, g, b].map((v) => to255(v).toString(16).padStart(2, "0")).join("")}`;
}

/** hex -> oklch string, written back into the preset so it stays oklch (defect-9). */
function toOklch(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	const o = srgbToOklch(r, g, b);
	return `oklch(${o.l.toFixed(3)} ${o.c.toFixed(3)} ${o.h.toFixed(2)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.slice(1), 16);
	return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

/** linear sRGB -> oklab -> oklch (CSS Color 4 matrices). */
function srgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
	const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	const rl = lin(r), gl = lin(g), bl = lin(b);
	const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
	const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
	const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
	const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
	const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	const C = Math.hypot(A, B);
	const H = (Math.atan2(B, A) * 180) / Math.PI;
	return { l: L, c: C, h: (H + 360) % 360 };
}
