/**
 * ChakrasPlayer Mobile — Spacing & Layout System
 */

import { Dimensions, Platform, StatusBar } from 'react-native';

// ---------------------------------------------------------------------------
// Spacing Scale
// ---------------------------------------------------------------------------

export const spacing = {
  /** 4px — tight inner padding, icon gaps */
  xs: 4,
  /** 8px — small padding, compact list gaps */
  sm: 8,
  /** 16px — default padding, section gaps */
  md: 16,
  /** 24px — generous padding, card inner spacing */
  lg: 24,
  /** 32px — large section spacing */
  xl: 32,
  /** 48px — extra-large hero spacing */
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const borderRadius = {
  /** 8px — subtle rounding, tags, small cards */
  sm: 8,
  /** 12px — default cards, inputs */
  md: 12,
  /** 16px — modal sheets, large cards */
  lg: 16,
  /** 24px — hero cards, album art */
  xl: 24,
  /** 9999px — fully rounded pills, circular buttons */
  pill: 9999,
} as const;

// ---------------------------------------------------------------------------
// Screen Dimensions
// ---------------------------------------------------------------------------

const windowDimensions = Dimensions.get('window');
const screenDimensions = Dimensions.get('screen');

export const screen = {
  /** Window width (excludes system UI on some devices) */
  width: windowDimensions.width,
  /** Window height (excludes system UI on some devices) */
  height: windowDimensions.height,
  /** Full screen width */
  fullWidth: screenDimensions.width,
  /** Full screen height */
  fullHeight: screenDimensions.height,
  /** Whether the screen is considered "small" (< 375px wide) */
  isSmall: windowDimensions.width < 375,
  /** Whether the screen is considered "large" (≥ 428px wide — Plus/Max iPhones, tablets) */
  isLarge: windowDimensions.width >= 428,
} as const;

// ---------------------------------------------------------------------------
// Safe Area Defaults (fallbacks before SafeAreaProvider measures)
// ---------------------------------------------------------------------------

const NOTCH_TOP = 47;
const NOTCH_BOTTOM = 34;
const ANDROID_STATUS_BAR = StatusBar.currentHeight ?? 24;

export const safeArea = {
  /** Default top inset — accounts for notch / dynamic island on iOS */
  top: Platform.OS === 'ios' ? NOTCH_TOP : ANDROID_STATUS_BAR,
  /** Default bottom inset — accounts for home indicator on iOS */
  bottom: Platform.OS === 'ios' ? NOTCH_BOTTOM : 0,
  /** Horizontal safe inset (landscape) */
  horizontal: 0,
} as const;

// ---------------------------------------------------------------------------
// Hit-slop / Touch targets (accessibility)
// ---------------------------------------------------------------------------

export const hitSlop = {
  /** Minimum touch target padding for accessibility (44×44 recommended) */
  default: { top: 8, right: 8, bottom: 8, left: 8 },
  /** Larger touch target for small icons */
  large: { top: 12, right: 12, bottom: 12, left: 12 },
} as const;

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export const layout = {
  /** Standard horizontal screen padding */
  screenPaddingHorizontal: spacing.md,
  /** Standard vertical screen padding */
  screenPaddingVertical: spacing.md,
  /** Mini-player height (collapsed) */
  miniPlayerHeight: 64,
  /** Tab bar height */
  tabBarHeight: 56,
  /** Header height */
  headerHeight: 56,
  /** Bottom sheet handle height */
  sheetHandleHeight: 24,
} as const;
