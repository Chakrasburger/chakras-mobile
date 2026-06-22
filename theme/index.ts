/**
 * ChakrasPlayer Mobile — Theme Index
 * Unified re-export of the complete design system
 */

// Re-export everything from each module
export {
  withOpacity,
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  background,
  text,
  border,
  status,
  colors,
} from './colors';
export type { AccentColor } from './colors';

export {
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  typography,
} from './typography';

export {
  spacing,
  borderRadius,
  screen,
  safeArea,
  hitSlop,
  layout,
} from './spacing';

export {
  glass,
  shadows,
  glassStyle,
  supportsBlur,
} from './glassmorphism';
export type { GlassIntensity, GlassConfig, ShadowConfig } from './glassmorphism';

// ---------------------------------------------------------------------------
// Unified theme object
// ---------------------------------------------------------------------------

import { colors, background, text, border, status } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, screen, safeArea, layout } from './spacing';
import { glass, shadows } from './glassmorphism';

export const theme = {
  colors,
  background,
  text,
  border,
  status,
  typography,
  spacing,
  borderRadius,
  screen,
  safeArea,
  layout,
  glass,
  shadows,
} as const;
