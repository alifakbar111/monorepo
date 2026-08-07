import {
	CONTAINER_SCALE,
	FONT_SIZE_SCALE,
	FONT_WEIGHT_SCALE,
	LINE_HEIGHT_SCALE,
	RADIUS_SCALE,
	TRACKING_SCALE,
	nearestStep,
	pxToRem,
	remToDisplay,
	snapSpacing,
} from "./scales";

export type ValueKind =
	| "width"
	| "radius"
	| "font-size"
	| "font-weight"
	| "line-height"
	| "tracking"
	| "spacing-x"
	| "spacing-y"
	| "height";

export interface ResolvedValue {
	/** final value for the theme var (rem or literal) */
	value: string;
	/** standard utility class when snapped ("" when as-is or n/a) */
	className: string;
	/** human display, e.g. "1200px → max-w-6xl (72rem, Δ48px)" */
	display: string;
	/** var namespace for override previews */
	varName: string;
	snapped: boolean;
	delta?: string;
}

export function convertValue(raw: string, kind: ValueKind, mode: "convert" | "as-is"): ResolvedValue {
	const asIs = (value: string, className: string, varName: string): ResolvedValue => ({
		value,
		className,
		display: `${raw} (as-is)`,
		varName,
		snapped: false,
	});

	const fromStep = (step: { key: string; rem: number; className: string }, deltaRem: number, varName: string): ResolvedValue => ({
		value: remToDisplay(step.rem),
		className: step.className,
		display: `${raw} → ${step.className} (${remToDisplay(step.rem)}${deltaRem > 0 ? `, Δ${remToDisplay(deltaRem)}` : ""})`,
		varName,
		snapped: true,
		delta: deltaRem > 0 ? remToDisplay(deltaRem) : undefined,
	});

	if (mode === "as-is") {
		return asIs(raw, "", kind === "radius" ? "radius" : kind);
	}

	switch (kind) {
		case "width": {
			const { step, deltaRem } = nearestStep(CONTAINER_SCALE, raw);
			return fromStep(step, deltaRem, "container");
		}
		case "radius": {
			const { step, deltaRem } = nearestStep(RADIUS_SCALE, raw);
			return fromStep(step, deltaRem, "radius");
		}
		case "font-size": {
			const { step, deltaRem } = nearestStep(FONT_SIZE_SCALE, raw);
			return fromStep(step, deltaRem, "text");
		}
		case "font-weight": {
			const { step, deltaRem } = nearestStep(FONT_WEIGHT_SCALE, raw);
			return fromStep(step, deltaRem, "font-weight");
		}
		case "line-height": {
			const { step, deltaRem } = nearestStep(LINE_HEIGHT_SCALE, raw);
			return fromStep(step, deltaRem, "line-height");
		}
		case "tracking": {
			const { step, deltaRem } = nearestStep(TRACKING_SCALE, raw);
			return fromStep(step, deltaRem, "tracking");
		}
		case "height":
		case "spacing-x":
		case "spacing-y": {
			const target = pxToRem(raw);
			const { step, rem } = snapSpacing(raw);
			const cls = `${kind === "height" ? "h" : kind === "spacing-x" ? "px" : "py"}-${step}`;
			return {
				value: remToDisplay(rem),
				className: cls,
				display: `${raw} → ${cls} (${remToDisplay(rem)})`,
				varName: "spacing",
				snapped: true,
				delta: Math.abs(target - rem) > 0 ? remToDisplay(Math.abs(target - rem)) : undefined,
			};
		}
	}
}
