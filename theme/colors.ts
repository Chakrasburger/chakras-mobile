/**
 * ChakrasPlayer Mobile — Color System
 * Liquid Glass design language with OLED-optimized dark theme
 */

// ---------------------------------------------------------------------------
// Helper: create an rgba variant of any hex/rgb color
// ---------------------------------------------------------------------------

export function withOpacity(color: string, opacity: number): string {
  // Handle hex colors (#RRGGBB or #RGB)
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Handle rgb(r, g, b)
  const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
  }

  // Handle existing rgba — replace existing alpha
  const rgbaMatch = color.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/,
  );
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
  }

  // Fallback — return as-is
  return color;
}

// ---------------------------------------------------------------------------
// Accent Color Presets (16+)
// ---------------------------------------------------------------------------

export type AccentColor = {
  name: string;
  value: string;
  light: string; // lighter tint for gradients
};

export const ACCENT_PRESETS: AccentColor[] = [
  { name: 'Blurple', value: '#5865F2', light: '#7983F5' },
  { name: 'Royal Blue', value: '#3B82F6', light: '#60A5FA' },
  { name: 'Sky Blue', value: '#0EA5E9', light: '#38BDF8' },
  { name: 'Cyan', value: '#06B6D4', light: '#22D3EE' },
  { name: 'Teal', value: '#14B8A6', light: '#2DD4BF' },
  { name: 'Emerald', value: '#10B981', light: '#34D399' },
  { name: 'Green', value: '#22C55E', light: '#4ADE80' },
  { name: 'Lime', value: '#84CC16', light: '#A3E635' },
  { name: 'Yellow', value: '#EAB308', light: '#FACC15' },
  { name: 'Amber', value: '#F59E0B', light: '#FBBF24' },
  { name: 'Orange', value: '#F97316', light: '#FB923C' },
  { name: 'Red', value: '#EF4444', light: '#F87171' },
  { name: 'Rose', value: '#F43F5E', light: '#FB7185' },
  { name: 'Pink', value: '#EC4899', light: '#F472B6' },
  { name: 'Fuchsia', value: '#D946EF', light: '#E879F9' },
  { name: 'Purple', value: '#A855F7', light: '#C084FC' },
  { name: 'Violet', value: '#8B5CF6', light: '#A78BFA' },
  { name: 'White', value: '#FFFFFF', light: '#E2E8F0' },
];

// ---------------------------------------------------------------------------
// Default accent (Blurple)
// ---------------------------------------------------------------------------

export const DEFAULT_ACCENT = ACCENT_PRESETS[0];

// ---------------------------------------------------------------------------
// Background Colors — OLED-optimized dark
// ---------------------------------------------------------------------------

export const background = {
  /** Main app background — near-pure black for OLED */
  primary: 'rgba(18, 18, 18, 0.95)',
  /** Opaque variant for non-blurred contexts */
  primarySolid: '#121212',
  /** Elevated surface — cards, modals */
  surface: 'rgba(54, 57, 63, 0.65)',
  /** Slightly lighter surface for nested elements */
  surfaceLight: 'rgba(54, 57, 63, 0.45)',
  /** Heavy surface — selected/active items */
  surfaceHeavy: 'rgba(54, 57, 63, 0.85)',
  /** Overlay for modals / drawers */
  overlay: 'rgba(0, 0, 0, 0.6)',
  /** Deep overlay for full-screen modals */
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',
  /** Subtle highlight for hover / pressed states */
  highlight: 'rgba(255, 255, 255, 0.06)',
  /** Pressed state */
  pressed: 'rgba(255, 255, 255, 0.1)',
} as const;

// ---------------------------------------------------------------------------
// Text Colors
// ---------------------------------------------------------------------------

export const text = {
  /** Primary text — headings, body */
  primary: '#DCDDDE',
  /** Secondary text — descriptions, labels */
  secondary: '#96989D',
  /** Muted text — placeholders, disabled */
  muted: '#72767D',
  /** Inverse text — on light/accent backgrounds */
  inverse: '#FFFFFF',
  /** Link text */
  link: '#5865F2',
} as const;

// ---------------------------------------------------------------------------
// Border Colors
// ---------------------------------------------------------------------------

export const border = {
  /** Default border */
  default: 'rgba(79, 84, 92, 0.4)',
  /** Subtle border — less visible */
  subtle: 'rgba(79, 84, 92, 0.25)',
  /** Strong border — active / focused */
  strong: 'rgba(79, 84, 92, 0.65)',
  /** Accent border */
  accent: 'rgba(88, 101, 242, 0.5)',
} as const;

// ---------------------------------------------------------------------------
// Status / Semantic Colors
// ---------------------------------------------------------------------------

export const status = {
  success: '#43B581',
  successLight: 'rgba(67, 181, 129, 0.15)',
  error: '#F04747',
  errorLight: 'rgba(240, 71, 71, 0.15)',
  warning: '#FAA61A',
  warningLight: 'rgba(250, 166, 26, 0.15)',
  info: '#5865F2',
  infoLight: 'rgba(88, 101, 242, 0.15)',
} as const;

// ---------------------------------------------------------------------------
// Unified export
// ---------------------------------------------------------------------------

export const colors = {
  accent: DEFAULT_ACCENT,
  accentPresets: ACCENT_PRESETS,
  background,
  text,
  border,
  status,
  withOpacity,
} as const;
