import { z } from "zod";

export const tokenValueSchema = z.object({
	value: z.string(),
	mode: z.enum(["convert", "as-is"]),
});
export type TokenValue = z.infer<typeof tokenValueSchema>;

// Radius override (three-tier: component > group > base): sets { value, mode } (opts out),
// { shift } (base+delta), or is ABSENT / null → inherit the next tier up.
export const radiusOverrideSchema = z
	.union([
		z.null(),
		z.object({ value: z.string(), mode: z.enum(["convert", "as-is"]) }),
		z.object({ shift: z.string() }),
	])
	.optional();
export type RadiusOverride = z.infer<typeof radiusOverrideSchema>;

// Font face: family stack + hosted URL (source) OR self-hosted woff2 paths (files), or neither.
export const fontFaceSchema = z.object({
	family: z.string(),
	source: z.string().nullish(),
	files: z.array(z.string()).nullish(),
});
export type FontFace = z.infer<typeof fontFaceSchema>;

const sizeEntrySchema = z.record(z.string(), z.unknown());

export const presetSchema = z.object({
	info: z.object({ name: z.string(), version: z.number() }),
	colors: z.object({
		light: z.record(z.string(), z.string()),
		dark: z.record(z.string(), z.string()),
	}),
	// Tier 1 — GENERAL fonts (three faces enforced); each is family + host mode
	fonts: z.object({
		heading: fontFaceSchema,
		body: fontFaceSchema,
		mono: fontFaceSchema,
	}),
	typeRoles: z.record(
		z.string(),
		z.object({
			size: z.string(),
			lineHeight: z.string(),
			weight: z.string(),
			tracking: z.string().optional(),
		}),
	),
	radius: z.object({ base: tokenValueSchema }),
	// Tier 2 — group radius overrides (null/shift/value; absent = inherit GENERAL base)
	radiusGroups: z.record(z.string(), radiusOverrideSchema),
	spacing: z.record(z.string(), z.union([tokenValueSchema, z.unknown()])),
	shadow: z.record(z.string(), z.string()),
	breakpoints: z.record(z.string(), z.string()),
	animation: z.object({
		duration: z.record(z.string(), z.string()),
		easing: z.record(z.string(), z.string()),
	}),
	// Three-tier: a component inherits its GROUP (which inherits GENERAL base) unless
	// `components.<name>.radius` opts out (component > group > base). `radius` reuses the
	// same null/value/shift union as radiusGroups; `sizes` carry per-variant widths.
	components: z.record(
		z.string(),
		z
			.object({
				group: z.string(),
				radius: radiusOverrideSchema, // optional — inherit group/base when absent
				sizes: z
					.record(
						z.string(),
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
