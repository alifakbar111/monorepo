import { z } from "zod";

// names that become CSS var names / class tokens — allowlist shape
const nameSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9-]*$/, "invalid name (use lowercase letters, digits, hyphens)");
// values interpolated into generated CSS — reject CSS-breaking chars (quotes are allowed: font family stacks legitimately contain "…")
const cssValueSchema = z
	.string()
	.refine((v) => !/[\n\r;}]/.test(v) && !v.includes("\0"), "invalid css value: contains ; } newline or NUL");
// URLs interpolated into @import url("…") — must not contain quote/paren/semicolon/newline
const fontUrlSchema = z.string().refine((v) => !/[\n\r;"')]/.test(v), "invalid font url");

export const tokenValueSchema = z.object({
	value: cssValueSchema,
	mode: z.enum(["convert", "as-is"]),
});
export type TokenValue = z.infer<typeof tokenValueSchema>;

// Radius override (three-tier: component > group > base): sets { value, mode } (opts out),
// { shift } (base+delta), or is ABSENT / null → inherit the next tier up.
export const radiusOverrideSchema = z
	.union([
		z.null(),
		z.object({ value: cssValueSchema, mode: z.enum(["convert", "as-is"]) }),
		z.object({ shift: cssValueSchema }),
	])
	.optional();
export type RadiusOverride = z.infer<typeof radiusOverrideSchema>;

// Font face: family stack + hosted URL (source) OR self-hosted woff2 paths (files), or neither.
export const fontFaceSchema = z.object({
	family: cssValueSchema,
	source: fontUrlSchema.nullish(),
	files: z.array(fontUrlSchema).nullish(),
});
export type FontFace = z.infer<typeof fontFaceSchema>;

const sizeEntrySchema = z.record(z.string(), z.unknown());

export const presetSchema = z.object({
	info: z.object({ name: z.string(), version: z.number() }),
	colors: z.object({
		light: z.record(nameSchema, cssValueSchema),
		dark: z.record(nameSchema, cssValueSchema),
	}),
	// Tier 1 — GENERAL fonts (three faces enforced); each is family + host mode
	fonts: z.object({
		heading: fontFaceSchema,
		body: fontFaceSchema,
		mono: fontFaceSchema,
	}),
	typeRoles: z.record(
		nameSchema,
		z.object({
			size: cssValueSchema,
			lineHeight: cssValueSchema,
			weight: cssValueSchema,
			tracking: cssValueSchema.optional(),
		}),
	),
	radius: z.object({ base: tokenValueSchema }),
	// Tier 2 — group radius overrides (null/shift/value; absent = inherit GENERAL base)
	radiusGroups: z.record(nameSchema, radiusOverrideSchema),
	spacing: z.record(nameSchema, z.union([tokenValueSchema, z.unknown()])),
	shadow: z.record(nameSchema, cssValueSchema),
	breakpoints: z.record(nameSchema, cssValueSchema),
	animation: z.object({
		duration: z.record(nameSchema, cssValueSchema),
		easing: z.record(nameSchema, cssValueSchema),
	}),
	// Three-tier: a component inherits its GROUP (which inherits GENERAL base) unless
	// `components.<name>.radius` opts out (component > group > base). `radius` reuses the
	// same null/value/shift union as radiusGroups; `sizes` carry per-variant widths.
	components: z.record(
		nameSchema,
		z
			.object({
				group: nameSchema,
				radius: radiusOverrideSchema, // optional — inherit group/base when absent
				sizes: z
					.record(
						nameSchema,
						z.object({
							width: tokenValueSchema,
						}),
					)
					.optional(),
			})
			.passthrough(),
	),
});

export type Preset = z.infer<typeof presetSchema>;
export type ColorSet = Preset["colors"]["light"];
export type TypeRole = Preset["typeRoles"][string];
