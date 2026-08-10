/**
 * Color Converter Utility
 * 
 * Converts between different color formats (hex, rgb, hsl, oklch)
 * with primary focus on converting to oklch for consistent theme storage.
 */

// Cache for conversions
const conversionCache = new Map<string, string>();

/**
 * Parse hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

/**
 * Parse rgb string to RGB components (0-1 range)
 */
function parseRgb(rgb: string): { r: number; g: number; b: number } | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255,
    };
  }
  return null;
}

/**
 * Parse hsl string to RGB components (0-1 range)
 */
function parseHsl(hsl: string): { r: number; g: number; b: number } | null {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    // HSL to RGB conversion
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r, g, b };
  }
  return null;
}

/**
 * Linear RGB to OKLab conversion
 */
function linearSrgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert linear sRGB to OKLCH
 */
function oklabToOklch(L: number, a: number, b: number): { L: number; C: number; H: number } {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return { L, C, H };
}

/**
 * Convert sRGB (0-1) to linear sRGB
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert RGB (0-1) to OKLCH
 */
function rgbToOklch(r: number, g: number, b: number): string {
  // Linearize sRGB
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  // Convert to OKLab
  const oklab = linearSrgbToOklab(lr, lg, lb);

  // Convert to OKLCH
  const oklch = oklabToOklch(oklab.L, oklab.a, oklab.b);

  // Round values for readability
  const L = Math.round(oklch.L * 1000) / 1000;
  const C = Math.round(oklch.C * 1000) / 1000;
  const H = Math.round(oklch.H * 10) / 10;

  return `oklch(${L} ${C} ${H})`;
}

/**
 * Convert hex to OKLCH
 */
function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert rgb() to OKLCH
 */
function rgbStringToOklch(rgb: string): string {
  const components = parseRgb(rgb);
  if (!components) return rgb;
  return rgbToOklch(components.r, components.g, components.b);
}

/**
 * Convert hsl() to OKLCH
 */
function hslToOklch(hsl: string): string {
  const rgb = parseHsl(hsl);
  if (!rgb) return hsl;
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

/**
 * Detect color format
 */
function detectColorFormat(color: string): 'hex' | 'rgb' | 'hsl' | 'oklch' | 'unknown' {
  if (color.startsWith('#')) return 'hex';
  if (color.startsWith('rgb')) return 'rgb';
  if (color.startsWith('hsl')) return 'hsl';
  if (color.startsWith('oklch')) return 'oklch';
  return 'unknown';
}

/**
 * Convert any color format to OKLCH
 * This is the main conversion function that should be used.
 */
export function toOklch(color: string): string {
  // Return cached value if available
  if (conversionCache.has(color)) {
    return conversionCache.get(color)!;
  }

  // Already oklch
  if (color.startsWith('oklch')) {
    conversionCache.set(color, color);
    return color;
  }

  let result: string;

  const format = detectColorFormat(color);
  switch (format) {
    case 'hex':
      result = hexToOklch(color);
      break;
    case 'rgb':
      result = rgbStringToOklch(color);
      break;
    case 'hsl':
      result = hslToOklch(color);
      break;
    default:
      // Can't convert, return as-is
      result = color;
  }

  // Cache the result
  conversionCache.set(color, result);
  return result;
}

/**
 * Convert OKLCH back to hex for display purposes
 */
export function oklchToHex(oklch: string): string {
  // Try to use DOM computation for accuracy
  try {
    const tempElement = document.createElement('div');
    tempElement.style.color = oklch;
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    document.body.appendChild(tempElement);

    const computedColor = getComputedStyle(tempElement).color;
    document.body.removeChild(tempElement);

    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback
  }

  return '#888888';
}

/**
 * Check if a color value needs conversion to oklch
 */
export function needsConversion(color: string): boolean {
  return !color.startsWith('oklch');
}

/**
 * Get color format for display
 */
export function getColorFormat(color: string): string {
  if (color.startsWith('oklch')) return 'oklch';
  if (color.startsWith('#')) return 'hex';
  if (color.startsWith('rgb')) return 'rgb';
  if (color.startsWith('hsl')) return 'hsl';
  return 'other';
}
