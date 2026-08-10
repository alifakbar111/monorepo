/**
 * Replacement rules for hardcoded Tailwind classes → semantic tokens.
 * Order matters: more specific patterns first.
 */
const RULES: Array<[RegExp, string]> = [
  // Button default variant
  [/bg-gray-900\/90/g, "bg-primary/90"],
  [/bg-gray-900/g, "bg-primary"],
  // Overlay dimming
  [/bg-black\/80/g, "bg-foreground/80"],
  // Tooltip / badge dark surfaces
  [/bg-black/g, "bg-foreground"],
  // White text on dark → semantic
  [/text-white\/70/g, "text-primary-foreground/70"],
  [/text-white/g, "text-primary-foreground"],
];

/**
 * Apply codemod rules to a *.css.ts file content.
 * Returns the modified content with hardcoded classes replaced by semantic tokens.
 */
export function codemodCssTs(content: string): string {
  let result = content;
  for (const [pattern, replacement] of RULES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
