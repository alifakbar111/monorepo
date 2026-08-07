export interface PresetGroup {
	id: string;
	label: string;
}

export const GROUPS: PresetGroup[] = [
	{ id: "button", label: "Buttons" },
	{ id: "input", label: "Inputs & Forms" },
	{ id: "overlay", label: "Overlays" },
	{ id: "card", label: "Cards" },
	{ id: "badge", label: "Badges & Avatars" },
	{ id: "surface", label: "Surfaces & Data" },
	{ id: "typography", label: "Typography" },
];

/**
 * component name → group id (mirrors scripts/component-map.ts DEFAULT_GROUP_ASSIGNMENT,
 * including the typography group and the 44 css.ts-bearing components — squircle,
 * carousel, chart, spinner ship no css.ts and are not tokenization targets).
 */
export const COMPONENT_GROUP: Record<string, string> = {
	button: "button",
	input: "input",
	label: "input",
	textarea: "input",
	select: "input",
	checkbox: "input",
	"radio-group": "input",
	switch: "input",
	slider: "input",
	calendar: "input",
	"input-otp": "input",
	form: "input",
	toggle: "input",
	"toggle-group": "input",
	dialog: "overlay",
	"alert-dialog": "overlay",
	drawer: "overlay",
	sheet: "overlay",
	popover: "overlay",
	"dropdown-menu": "overlay",
	"context-menu": "overlay",
	"hover-card": "overlay",
	tooltip: "overlay",
	command: "overlay",
	toast: "overlay",
	card: "card",
	badge: "badge",
	avatar: "badge",
	table: "surface",
	tabs: "surface",
	accordion: "surface",
	alert: "surface",
	skeleton: "surface",
	progress: "surface",
	"scroll-area": "surface",
	resizable: "surface",
	separator: "surface",
	collapsible: "surface",
	"aspect-ratio": "surface",
	breadcrumb: "surface",
	pagination: "surface",
	sidebar: "surface",
	heading: "typography",
	text: "typography",
};
