import type { Preset } from "./types";
import type { ResolvedComponentSpec } from "./component-map";
import { convertValue } from "./conversion"; // used per-mode for the base + semantic radii below

export function generateColorsCss(preset: Preset): string {
	const varLine = (set: Record<string, string>, indent: string) =>
		Object.entries(set).map(([k, v]) => `${indent}--${k}: ${v};`).join("\n");

	// Defect-4 fix: the dark block is NESTED inside :root (exactly like the real file),
	// NOT a sibling under @layer utilities — a bare `&` with no parent rule is dead CSS.
	return `@layer utilities {
\t:root {
${varLine(preset.colors.light, "\t\t")}

\t\t&:where([data-theme="dark"], [data-theme="dark"] *) {
${varLine(preset.colors.dark, "\t\t\t")}
\t\t}
\t}
}
`;
}

export function generateGlobalCss(preset: Preset, specs: ResolvedComponentSpec[]): string {
	const colorMapping = Object.keys(preset.colors.light)
		.map((k) => `\t--color-${k}: var(--${k});`)
		.join("\n");

	// SUPERSET (defect-3): preserve the semantic/literal color aliases the current
	// global.css emits but the preset's `--color-${k}` mapping cannot derive —
	//   - `--color-black` is a LITERAL in the real file (#0b0c0e); no `black` preset key (colors.css has no `--black`).
	//   - `--color-sidebar` aliases `var(--sidebar-background)` (the mapping emits the
	//     fully-qualified `--color-sidebar-background`, which is fine as an EXTRA, but the
	//     bare `--color-sidebar` token must not be dropped or `bg-sidebar` breaks).
	// Both must be emitted or the token-superset guard (and `bg-black`/`bg-sidebar`) silently
	// lose their live values.
	const preservedColors = [
		"\t--color-black: #0b0c0e;",
		"\t--color-sidebar: var(--sidebar-background);",
	].join("\n");

	const typeRoles = Object.entries(preset.typeRoles)
		.map(
			([role, r]) =>
				`\t--text-${role}: ${r.size};\n\t--text-${role}--line-height: ${r.lineHeight};`,
		)
		.join("\n");

	// Defect-1 fix: the base radius goes through convertValue per-mode —
	// convert → snapped value (WYSIWYG), as-is → literal.
	const base = convertValue(preset.radius.base.value, "radius", preset.radius.base.mode);
	const radiusScale = [
		`\t--radius: ${base.value};`,
		`\t--radius-base: ${base.value};`,
		// SUPERSET (defect-3): preserve the --radius-sm/md/lg tier so `rounded-md` etc.
		// keep tracking --radius instead of falling back to fixed 0.375rem.
		`\t--radius-lg: var(--radius);`,
		`\t--radius-md: calc(var(--radius) - 2px);`,
		`\t--radius-sm: calc(var(--radius) - 4px);`,
	].join("\n");

	// Three-tier semantic radii: emit a token for EVERY group/component that opts out
	// (group token, or component token when the component overrides its group). Values
	// go through convertValue per-mode so codegen == dashboard preview.
	// Dedup by token: many components share a group (e.g. every `input`), so only the
	// first spec carrying a given token emits the var line.
	const emitted = new Set<string>();
	const semanticRadii = specs
		.toSorted((a, b) => (a.radius.kind === "inherit" ? 1 : 0) - (b.radius.kind === "inherit" ? 1 : 0)) // group tokens before inheriters, for deterministic ordering
		.map((s) => {
			if (s.radius.kind === "value") {
				const rv = convertValue(s.radius.value.value, "radius", s.radius.value.mode);
				const line = `\t--radius-${s.radius.token}: ${rv.value};`;
				return emitted.has(s.radius.token) ? null : (emitted.add(s.radius.token), line);
			}
			if (s.radius.kind === "shift") {
				const line = `\t--radius-${s.radius.token}: calc(var(--radius) + ${s.radius.shift});`;
				return emitted.has(s.radius.token) ? null : (emitted.add(s.radius.token), line);
			}
			return null; // inherits base — no token emitted
		})
		.filter((line): line is string => line !== null)
		.join("\n");

	const containers = specs
		.flatMap((s) => s.sizes.map((sz) => `\t--container-${s.name}-${sz.key}: ${sz.widthValue};`))
		.join("\n");

	const shadows = Object.entries(preset.shadow)
		.map(([k, v]) => `\t--shadow-${k}: ${v};`)
		.join("\n");

	const breakpoints = Object.entries(preset.breakpoints)
		.map(([k, v]) => `\t--breakpoint-${k}: ${v};`)
		.join("\n");

	const faces = {
		heading: preset.fonts.heading,
		body: preset.fonts.body,
		mono: preset.fonts.mono,
	};
	// `--font-sans` is the ALIAS Tailwind's `font-sans` utility resolves. The preset
	// only has heading/body/mono; the real global.css maps `--font-sans` to the body
	// family, so emit it (pointing at the body face) or `font-sans` silently breaks.
	const fonts = [
		`\t--font-heading: ${preset.fonts.heading.family};`,
		`\t--font-body: ${preset.fonts.body.family};`,
		`\t--font-sans: ${preset.fonts.body.family};`,
		`\t--font-mono: ${preset.fonts.mono.family};`,
	].join("\n");

	// Hosted font URL(s) → @import at top; self-hosted woff2 → @font-face blocks.
	const imports = [...new Set(Object.values(faces).map((f) => f.source).filter((s): s is string => !!s))]
		.map((url) => `@import url("${url}");`)
		.join("\n");
	const fontFaces = Object.values(faces)
		.filter((f) => f.files && f.files.length > 0)
		.map((f) =>
			f.files!.map(
				(file) =>
					`@font-face {\n\tfont-family: "${f.family.split(",")[0].trim().replace(/^"|"$/g, "")}";\n\tsrc: url("${file}") format("woff2");\n\tfont-display: swap;\n}`,
			).join("\n"),
		)
		.join("\n");

	const durations = Object.entries(preset.animation.duration)
		.map(([k, v]) => `\t--duration-${k}: ${v};`)
		.join("\n");
	const easings = Object.entries(preset.animation.easing)
		.map(([k, v]) => `\t--ease-${k}: ${v};`)
		.join("\n");

	// static wrapper preserved from the current global.css
	const importsBlock = imports ? `${imports}\n\n` : "";
	const fontFacesBlock = fontFaces ? `\n${fontFaces}\n` : "";
	return `${importsBlock}@import "tailwindcss";

/* The preset Vite app sets root: "src/preset", so Tailwind v4's automatic
   source detection only scans from there. This @source makes the component
   library (src/components/**) visible so their utility classes are generated. */
@source "../components/**/*.{ts,tsx}";

@theme {
${colorMapping}
${preservedColors}

\t/* Typography */
${typeRoles}

\t/* Border Radius */
${radiusScale}
${semanticRadii}

\t/* Component Widths */
${containers}

\t/* Shadows */
${shadows}

\t/* Breakpoints */
${breakpoints}

\t/* Fonts */
${fonts}

\t/* Spacing base */
\t--spacing: 0.25rem;
${durations}
${easings}

\t/* Sidebar Width */
\t--sidebar-width: 16rem;
\t--sidebar-width-mobile: 18rem;
\t--sidebar-width-icon: 3rem;

\t/* Animation */
\t--animate-accordion-down: accordion-down 0.2s ease-out;
\t--animate-accordion-up: accordion-up 0.2s ease-out;

\t@keyframes accordion-down {
\t\tfrom { height: 0; }
\t\tto { height: var(--radix-accordion-content-height); }
\t}

\t@keyframes accordion-up {
\t\tfrom { height: var(--radix-accordion-content-height); }
\t\tto { height: 0; }
\t}
}

@layer base {
\t* {
\t\t@apply border-border;
\t}
\thtml,
\tbody {
\t\t@apply antialiased min-h-screen scroll-smooth;
\t}
\tbody {
\t\t@apply bg-background text-foreground font-sans;
\t}
}

/* Debug element */
@utility debug {
\tborder-width: 1px;
\tborder-style: dashed;
\tborder-color: #f87171;
}
${fontFacesBlock}`;
}
