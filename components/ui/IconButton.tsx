import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FontAwesome } from '@expo/vector-icons';

import { text as textColors, background } from '../../theme/colors';
import { borderRadius as radii, spacing, hitSlop } from '../../theme/spacing';
import { useSettingsStore } from '../../stores/settingsStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconButtonProps {
  /** FontAwesome icon name */
  name: React.ComponentProps<typeof FontAwesome>['name'];
  /** Icon pixel size (default 22) */
  size?: number;
  /** Icon color (default text.primary) */
  color?: string;
  /** Press handler */
  onPress?: () => void;
  /** Optional badge number (top-right overlay) */
  badge?: number;
  /** Whether to trigger haptic feedback on press (default true) */
  haptic?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Background color for the circle (default transparent highlight) */
  backgroundColor?: string;
  /** Total button diameter override */
  buttonSize?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 22,
  color = textColors.primary,
  onPress,
  badge,
  haptic = true,
  disabled = false,
  style,
  backgroundColor = 'transparent',
  buttonSize = 44,
}) => {
  const { theme, accentColor } = useSettingsStore();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, {
      damping: 15,
      stiffness: 350,
      mass: 0.6,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 250,
      mass: 0.6,
    });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [haptic, onPress]);

  const hasBadge = badge !== undefined && badge > 0;
  const displayBadge = hasBadge ? (badge > 99 ? '99+' : String(badge)) : '';

  const dynamicBgBorder = theme === 'oled' ? '#000000' : '#121212';

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop.default}
      style={[
        styles.container,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor,
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <FontAwesome name={name} size={size} color={color} />

      {/* Badge overlay */}
      {hasBadge && (
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: accentColor, borderColor: dynamicBgBorder }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {displayBadge}
            </Text>
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default IconButton;
