/**
 * GlassButton — Pressable glassmorphism button
 * Variants: primary (accent gradient), secondary (glass), ghost (transparent), danger (red glass)
 * Sizes: sm, md, lg
 * Features press scale animation, loading spinner, optional icon
 */

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FontAwesome } from '@expo/vector-icons';

import { text as textColors, withOpacity, status } from '../../theme/colors';
import { shadows, supportsBlur } from '../../theme/glassmorphism';
import { borderRadius as radii, spacing } from '../../theme/spacing';
import { fontFamily, fontSize as fs, fontWeight } from '../../theme/typography';
import { useSettingsStore } from '../../stores/settingsStore';
import { lighten } from '../../utils/colorUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Button label */
  label: string;
  /** Optional FontAwesome icon name (displayed before label) */
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  /** Press handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state — shows spinner and disables interaction */
  loading?: boolean;
  /** Custom accent color override (for primary variant) */
  accentColor?: string;
  /** Custom accent light color override (for primary gradient end) */
  accentLight?: string;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

interface SizeConfig {
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSize: number;
  borderRadius: number;
}

const SIZE_CONFIGS: Record<ButtonSize, SizeConfig> = {
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    fontSize: fs.bodySmall,
    iconSize: 14,
    borderRadius: radii.sm,
  },
  md: {
    height: 44,
    paddingHorizontal: spacing.lg,
    fontSize: fs.body,
    iconSize: 16,
    borderRadius: radii.md,
  },
  lg: {
    height: 52,
    paddingHorizontal: spacing.xl,
    fontSize: fs.h3,
    iconSize: 18,
    borderRadius: radii.lg,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  accentColor: accentColorProp,
  accentLight: accentLightProp,
  style,
}) => {
  const { theme, accentColor: storeAccentColor, glassOpacity, blurIntensity } = useSettingsStore();
  const activeAccent = accentColorProp || storeAccentColor;
  const activeAccentLight = accentLightProp || lighten(activeAccent, 0.25);

  const sizeConfig = SIZE_CONFIGS[size];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
      mass: 0.8,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 200,
      mass: 0.8,
    });
  }, [scale]);

  const isDisabled = disabled || loading;

  // Compute container styling dynamically based on settings
  const containerVariantStyle = React.useMemo(() => {
    const isOled = theme === 'oled';
    switch (variant) {
      case 'primary':
        return {
          overflow: 'hidden' as const,
        };
      case 'secondary':
        return {
          backgroundColor: isOled
            ? `rgba(22, 22, 22, ${glassOpacity})`
            : `rgba(54, 57, 63, ${glassOpacity})`,
          borderColor: isOled
            ? `rgba(255, 255, 255, 0.08)`
            : `rgba(79, 84, 92, 0.45)`,
          borderWidth: 1,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: withOpacity(status.error, 0.2),
          borderColor: withOpacity(status.error, 0.4),
          borderWidth: 0.5,
        };
    }
  }, [variant, theme, glassOpacity]);

  const textColor = React.useMemo(() => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return textColors.primary;
      case 'ghost':
        return textColors.secondary;
      case 'danger':
        return status.error;
    }
  }, [variant]);

  const containerStyle: ViewStyle = {
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    borderRadius: sizeConfig.borderRadius,
    opacity: isDisabled ? 0.5 : 1,
  };

  const labelStyle: TextStyle = {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: sizeConfig.fontSize,
    fontWeight: fontWeight.semibold,
    color: textColor,
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.container,
        containerStyle,
        containerVariantStyle,
        variant === 'primary' && shadows.glow(activeAccent),
        animatedStyle,
        style,
      ]}
    >
      {/* Primary gradient background */}
      {variant === 'primary' && (
        <LinearGradient
          colors={[activeAccent, activeAccentLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Blur layer for secondary variant */}
      {variant === 'secondary' && supportsBlur && (
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Content */}
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.spinner}
          />
        ) : (
          <>
            {icon && (
              <FontAwesome
                name={icon}
                size={sizeConfig.iconSize}
                color={textColor}
                style={styles.icon}
              />
            )}
            <Text style={labelStyle} numberOfLines={1}>
              {label}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  icon: {
    marginRight: spacing.sm,
  },
  spinner: {
    marginRight: 0,
  },
});

export default GlassButton;
