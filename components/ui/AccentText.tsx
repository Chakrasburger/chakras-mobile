import React from 'react';
import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

import { typography } from '../../theme/typography';
import { useSettingsStore } from '../../stores/settingsStore';
import { lighten } from '../../utils/colorUtils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AccentTextProps {
  /** Text content */
  children: React.ReactNode;
  /** Additional text styles */
  style?: StyleProp<TextStyle>;
  /** Whether to render with gradient fill (default false — solid accent) */
  gradient?: boolean;
  /** Custom accent color override */
  accentColor?: string;
  /** Custom lighter accent for gradient end */
  accentLight?: string;
  /** Number of lines before truncation */
  numberOfLines?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AccentText: React.FC<AccentTextProps> = ({
  children,
  style,
  gradient = false,
  accentColor: accentColorProp,
  accentLight: accentLightProp,
  numberOfLines,
}) => {
  const { accentColor: storeAccentColor } = useSettingsStore();
  const activeAccent = accentColorProp || storeAccentColor;
  const activeAccentLight = accentLightProp || lighten(activeAccent, 0.25);

  // Flatten style to extract fontSize for gradient sizing
  const flattenedStyle = StyleSheet.flatten(style) || {};

  // ── Solid accent text ────────────────────────────────────────────────
  if (!gradient) {
    return (
      <Text
        style={[styles.base, { color: activeAccent }, style]}
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    );
  }

  // ── Gradient text via MaskedView ─────────────────────────────────────
  // MaskedView uses the alpha channel of the mask element. We render
  // opaque text as the mask, then paint a gradient behind it.

  return (
    <MaskedView
      maskElement={
        <Text
          style={[styles.base, style, styles.maskText]}
          numberOfLines={numberOfLines}
        >
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={[activeAccent, activeAccentLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
      >
        {/* Invisible text to size the gradient to match the mask */}
        <Text
          style={[styles.base, style, styles.hiddenText]}
          numberOfLines={numberOfLines}
        >
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    ...typography.body,
  },
  maskText: {
    // Must be opaque for the mask — color doesn't matter, only alpha channel
    color: '#000000',
    backgroundColor: 'transparent',
  },
  hiddenText: {
    // Invisible — only used to give the gradient the correct dimensions
    opacity: 0,
  },
});

export default AccentText;
