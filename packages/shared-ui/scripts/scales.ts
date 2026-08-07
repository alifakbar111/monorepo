export interface ScaleStep {
	key: string;
	/** canonical value in rem */
	rem: number;
	/** utility class prefix + key, e.g. "max-w-" + "6xl" */
	className: string;
}

function pxToRem(value: string): number {
	const v = value.trim();
	if (v.endsWith("rem")) return Number.parseFloat(v);
	if (v.endsWith("px")) return Number.parseFloat(v) / 16;
	return Number.parseFloat(v); // bare number = rem
}

export function nearestStep(steps: ScaleStep[], value: string): { step: ScaleStep; deltaRem: number } {
	const target = pxToRem(value);
	let best = steps[0];
	let bestDelta = Math.abs(steps[0].rem - target);
	for (const s of steps) {
		const d = Math.abs(s.rem - target);
		if (d < bestDelta) {
			best = s;
			bestDelta = d;
		}
	}
	return { step: best, deltaRem: Math.abs(best.rem - target) };
}

// Tailwind v4 default scales (rem)
export const CONTAINER_SCALE: ScaleStep[] = [
	{ key: "3xs", rem: 16, className: "max-w-3xs" },
	{ key: "2xs", rem: 18, className: "max-w-2xs" },
	{ key: "xs", rem: 20, className: "max-w-xs" },
	{ key: "sm", rem: 24, className: "max-w-sm" },
	{ key: "md", rem: 28, className: "max-w-md" },
	{ key: "lg", rem: 32, className: "max-w-lg" },
	{ key: "xl", rem: 36, className: "max-w-xl" },
	{ key: "2xl", rem: 42, className: "max-w-2xl" },
	{ key: "3xl", rem: 48, className: "max-w-3xl" },
	{ key: "4xl", rem: 56, className: "max-w-4xl" },
	{ key: "5xl", rem: 64, className: "max-w-5xl" },
	{ key: "6xl", rem: 72, className: "max-w-6xl" },
	{ key: "7xl", rem: 80, className: "max-w-7xl" },
];

export const RADIUS_SCALE: ScaleStep[] = [
	{ key: "xs", rem: 0.125, className: "rounded-xs" },
	{ key: "sm", rem: 0.25, className: "rounded-sm" },
	{ key: "md", rem: 0.375, className: "rounded-md" },
	{ key: "lg", rem: 0.5, className: "rounded-lg" },
	{ key: "xl", rem: 0.75, className: "rounded-xl" },
	{ key: "2xl", rem: 1, className: "rounded-2xl" },
	{ key: "3xl", rem: 1.5, className: "rounded-3xl" },
	{ key: "4xl", rem: 2, className: "rounded-4xl" },
	{ key: "full", rem: Number.POSITIVE_INFINITY, className: "rounded-full" },
];

export const FONT_SIZE_SCALE: ScaleStep[] = [
	{ key: "xs", rem: 0.75, className: "text-xs" },
	{ key: "sm", rem: 0.875, className: "text-sm" },
	{ key: "base", rem: 1, className: "text-base" },
	{ key: "lg", rem: 1.125, className: "text-lg" },
	{ key: "xl", rem: 1.25, className: "text-xl" },
	{ key: "2xl", rem: 1.5, className: "text-2xl" },
	{ key: "3xl", rem: 1.875, className: "text-3xl" },
	{ key: "4xl", rem: 2.25, className: "text-4xl" },
	{ key: "5xl", rem: 3, className: "text-5xl" },
	{ key: "6xl", rem: 3.75, className: "text-6xl" },
];

export const FONT_WEIGHT_SCALE: ScaleStep[] = [
	{ key: "thin", rem: 100, className: "font-thin" },
	{ key: "extralight", rem: 200, className: "font-extralight" },
	{ key: "light", rem: 300, className: "font-light" },
	{ key: "normal", rem: 400, className: "font-normal" },
	{ key: "medium", rem: 500, className: "font-medium" },
	{ key: "semibold", rem: 600, className: "font-semibold" },
	{ key: "bold", rem: 700, className: "font-bold" },
	{ key: "extrabold", rem: 800, className: "font-extrabold" },
	{ key: "black", rem: 900, className: "font-black" },
];

export const LINE_HEIGHT_SCALE: ScaleStep[] = [
	{ key: "none", rem: 1, className: "leading-none" },
	{ key: "tight", rem: 1.25, className: "leading-tight" },
	{ key: "snug", rem: 1.375, className: "leading-snug" },
	{ key: "normal", rem: 1.5, className: "leading-normal" },
	{ key: "relaxed", rem: 1.625, className: "leading-relaxed" },
	{ key: "loose", rem: 2, className: "leading-loose" },
];

export const TRACKING_SCALE: ScaleStep[] = [
	{ key: "tighter", rem: -0.05, className: "tracking-tighter" },
	{ key: "tight", rem: -0.025, className: "tracking-tight" },
	{ key: "normal", rem: 0, className: "tracking-normal" },
	{ key: "wide", rem: 0.025, className: "tracking-wide" },
	{ key: "wider", rem: 0.05, className: "tracking-wider" },
	{ key: "widest", rem: 0.1, className: "tracking-widest" },
];

export const SPACING_BASE = 0.25; // 0.25rem = 4px

export function snapSpacing(value: string): { step: number; rem: number } {
	const target = pxToRem(value);
	const step = Math.round(target / SPACING_BASE);
	const rem = step * SPACING_BASE;
	return { step, rem };
}

export function remToDisplay(rem: number): string {
	if (rem === Number.POSITIVE_INFINITY) return "9999px";
	if (rem === 0) return "0";
	return `${rem}rem`;
}

export { pxToRem };
