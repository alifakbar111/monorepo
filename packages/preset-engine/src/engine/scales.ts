/**
 * Tailwind v4 default radius scale, derived from --radius base.
 * The multiplier approach matches shadcn's model.
 */
export const RADIUS_MULTIPLIERS: Record<string, number> = {
  sm: 0.6,
  md: 0.8,
  lg: 1, // base
  xl: 1.4,
  "2xl": 1.8,
  "3xl": 2.2,
  "4xl": 2.6,
};
