/**
 * ChakrasPlayer Mobile — Typography System
 * Inter for body text · Outfit for display headings
 */

import { StyleSheet, TextStyle, Platform } from 'react-native';
import { text } from './colors';

const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

// ---------------------------------------------------------------------------
// Font Families
// ---------------------------------------------------------------------------

export const fontFamily = {
  /** Body text — clean, highly legible sans-serif */
  body: systemFont,
  bodyMedium: systemFont,
  bodySemiBold: systemFont,
  bodyBold: systemFont,
  /** Display headings — geometric, modern sans-serif */
  display: systemFont,
  displayMedium: systemFont,
  displaySemiBold: systemFont,
  displayBold: systemFont,
} as const;

// ---------------------------------------------------------------------------
// Font Weights (numeric — React Native compatible)
// ---------------------------------------------------------------------------

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

// ---------------------------------------------------------------------------
// Font Sizes
// ---------------------------------------------------------------------------

export const fontSize = {
  displayLarge: 32,
  display: 28,
  h1: 24,
  h2: 20,
  h3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  micro: 10,
} as const;

// ---------------------------------------------------------------------------
// Line Heights (≈ 1.4–1.5× font size, rounded)
// ---------------------------------------------------------------------------

export const lineHeight = {
  displayLarge: 40,
  display: 36,
  h1: 32,
  h2: 28,
  h3: 24,
  body: 24,
  bodySmall: 20,
  caption: 16,
  micro: 14,
} as const;

// ---------------------------------------------------------------------------
// Letter Spacing
// ---------------------------------------------------------------------------

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
  widest: 1.0,
  caps: 1.5,
} as const;

// ---------------------------------------------------------------------------
// Pre-composed Text Styles
// ---------------------------------------------------------------------------

export const typography = StyleSheet.create({
  /** 32px Outfit Bold — hero / splash headings */
  displayLarge: {
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.displayLarge,
    lineHeight: lineHeight.displayLarge,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    color: text.primary,
  },

  /** 28px Outfit SemiBold — section display titles */
  display: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    color: text.primary,
  },

  /** 24px Outfit SemiBold — page titles */
  h1: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: fontSize.h1,
    lineHeight: lineHeight.h1,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    color: text.primary,
  },

  /** 20px Outfit Medium — section headings */
  h2: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.h2,
    lineHeight: lineHeight.h2,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
    color: text.primary,
  },

  /** 18px Inter SemiBold — sub-headings */
  h3: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.h3,
    lineHeight: lineHeight.h3,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.normal,
    color: text.primary,
  },

  /** 16px Inter Regular — default body text */
  body: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.normal,
    color: text.primary,
  },

  /** 16px Inter Medium — emphasized body text */
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
    color: text.primary,
  },

  /** 14px Inter Regular — smaller body / list items */
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.normal,
    color: text.secondary,
  },

  /** 14px Inter Medium — emphasized small text */
  bodySmallMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodySmall,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
    color: text.secondary,
  },

  /** 12px Inter Regular — captions, timestamps */
  caption: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.regular,
    letterSpacing: letterSpacing.wide,
    color: text.muted,
  },

  /** 12px Inter SemiBold — labels, badges */
  captionBold: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.wider,
    color: text.muted,
  },

  /** 10px Inter Medium — micro labels, fine print */
  micro: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.widest,
    color: text.muted,
  },

  /** Uppercase label style — ALL CAPS, wide tracking */
  overline: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.micro,
    lineHeight: lineHeight.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.caps,
    textTransform: 'uppercase',
    color: text.muted,
  },
});
