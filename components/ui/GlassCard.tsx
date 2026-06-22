import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { shadows, supportsBlur, GlassIntensity } from '../../theme/glassmorphism';
import { borderRadius as radii } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GlassCardProps {
  /** Glass intensity level */
  intensity?: GlassIntensity;
  /** Child content */
  children: React.ReactNode;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Border radius override */
  borderRadius?: number;
  /** Optional accent glow color (adds colored shadow) */
  glowColor?: string;
  /** Whether to animate mount (default true) */
  animated?: boolean;
  /** Entering animation duration ms */
  animationDuration?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GlassCard: React.FC<GlassCardProps> = ({
  intensity = 'medium',
  children,
  style,
  borderRadius = radii.lg,
  glowColor,
  animated = true,
  animationDuration = 400,
}) => {
  const { theme, glassOpacity, blurIntensity } = useSettingsStore();

  // Dynamically compute styling based on theme, glassOpacity, blurIntensity and intensity prop
  const dynamicConfig = React.useMemo(() => {
    const isOled = theme === 'oled';
    let baseOpacity = glassOpacity;
    let baseBlur = blurIntensity;

    if (intensity === 'light') {
      baseOpacity = glassOpacity * 0.5;
      baseBlur = blurIntensity * 0.4;
    } else if (intensity === 'heavy') {
      baseOpacity = Math.min(1.0, glassOpacity * 1.15);
      baseBlur = Math.min(100, blurIntensity * 1.25);
    } else if (intensity === 'solid') {
      baseOpacity = 0.95;
      baseBlur = 100;
    }

    const backgroundColor = isOled
      ? `rgba(18, 18, 18, ${baseOpacity * 0.8})`
      : `rgba(54, 57, 63, ${baseOpacity})`;

    const borderColor = isOled
      ? `rgba(255, 255, 255, 0.08)`
      : `rgba(79, 84, 92, 0.45)`;

    const borderWidth = intensity === 'light' ? 0.5 : 1;

    return {
      backgroundColor,
      borderColor,
      borderWidth,
      blurIntensity: baseBlur,
      blurTint: 'dark' as const,
    };
  }, [theme, glassOpacity, blurIntensity, intensity]);

  const glowShadow = glowColor ? shadows.glow(glowColor) : shadows.glass;

  const containerStyle: ViewStyle = {
    borderRadius,
    borderColor: dynamicConfig.borderColor,
    borderWidth: dynamicConfig.borderWidth,
    overflow: 'hidden',
    ...glowShadow,
  };

  const entering = animated
    ? FadeIn.duration(animationDuration).springify().damping(18).stiffness(120)
    : undefined;

  const content = (
    <>
      {/* Blur layer — iOS gets real backdrop blur, Android/Web gets fallback */}
      {supportsBlur ? (
        <BlurView
          intensity={dynamicConfig.blurIntensity}
          tint={dynamicConfig.blurTint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Color overlay on top of blur */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: dynamicConfig.backgroundColor },
        ]}
      />

      {/* Inner content */}
      <Animated.View style={styles.content}>
        {children}
      </Animated.View>
    </>
  );

  return (
    <Animated.View
      entering={entering}
      style={[containerStyle, style]}
    >
      {content}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassCard;
