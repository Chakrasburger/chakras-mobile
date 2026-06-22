/**
 * ChakrasPlayer Mobile — Glassmorphism & Shadow System
 * "Liquid Glass" design tokens for blur, surface, and shadow effects
 */

import { Platform, ViewStyle } from 'react-native';
import { border } from './colors';

// ---------------------------------------------------------------------------
// Glass Effect Configurations
// ---------------------------------------------------------------------------

export type GlassIntensity = 'light' | 'medium' | 'heavy' | 'solid';

export interface GlassConfig {
  /** Semi-transparent background color */
  backgroundColor: string;
  /** Border color */
  borderColor: string;
  /** Border width */
  borderWidth: number;
  /** Blur intensity (expo-blur BlurView intensity prop, 0–100) */
  blurIntensity: number;
  /** Blur tint for expo-blur */
  blurTint: 'dark' | 'light' | 'default';
}

export const glass: Record<GlassIntensity, GlassConfig> = {
  /** Subtle glass — barely visible, background peeks through */
  light: {
    backgroundColor: 'rgba(30, 31, 34, 0.4)',
    borderColor: border.subtle,
    borderWidth: 0.5,
    blurIntensity: 25,
    blurTint: 'dark',
  },

  /** Default glass — balanced translucency and blur */
  medium: {
    backgroundColor: 'rgba(42, 44, 50, 0.55)',
    borderColor: border.default,
    borderWidth: 0.5,
    blurIntensity: 50,
    blurTint: 'dark',
  },

  /** Heavy glass — more opaque, strong blur for readability */
  heavy: {
    backgroundColor: 'rgba(54, 57, 63, 0.75)',
    borderColor: border.strong,
    borderWidth: 1,
    blurIntensity: 80,
    blurTint: 'dark',
  },

  /** Solid — no transparency, used for fully opaque surfaces */
  solid: {
    backgroundColor: 'rgba(54, 57, 63, 0.95)',
    borderColor: border.strong,
    borderWidth: 1,
    blurIntensity: 100,
    blurTint: 'dark',
  },
};

// ---------------------------------------------------------------------------
// Shadow Presets
// ---------------------------------------------------------------------------

export interface ShadowConfig {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android
}

function createShadow(
  color: string,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number,
): ShadowConfig {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

export const shadows = {
  /** Barely-there shadow — cards resting on surface */
  subtle: createShadow('#000000', 1, 0.15, 3, 2) as ViewStyle,

  /** Glass-appropriate shadow — floating glass elements */
  glass: createShadow('#000000', 4, 0.25, 8, 5) as ViewStyle,

  /** Elevated shadow — modals, dropdown menus */
  elevated: createShadow('#000000', 8, 0.35, 16, 10) as ViewStyle,

  /**
   * Accent glow — colored shadow emanating from element.
   * Pass an accent color to tint the glow.
   */
  glow: (accentColor: string): ViewStyle => ({
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),

  /** No shadow — explicitly remove */
  none: createShadow('transparent', 0, 0, 0, 0) as ViewStyle,
};

// ---------------------------------------------------------------------------
// Glass style builder — returns a ViewStyle for StyleSheet-compatible usage
// ---------------------------------------------------------------------------

export function glassStyle(
  intensity: GlassIntensity = 'medium',
): ViewStyle {
  const config = glass[intensity];
  return {
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    borderWidth: config.borderWidth,
    overflow: 'hidden',
  };
}

// ---------------------------------------------------------------------------
// Platform-aware blur check
// ---------------------------------------------------------------------------

/** Whether the platform supports real-time backdrop blur well */
export const supportsBlur: boolean = Platform.OS === 'ios';
