import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { text as textColors, withOpacity } from '../../theme/colors';
import { shadows } from '../../theme/glassmorphism';
import { useSettingsStore } from '../../stores/settingsStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CustomSliderProps {
  /** Current value 0–1 */
  value: number;
  /** Called with new value 0–1 during drag and on release */
  onValueChange?: (value: number) => void;
  /** Called only on gesture end with final value */
  onSlidingComplete?: (value: number) => void;
  /** Filled track color (default accent) */
  minimumTrackColor?: string;
  /** Unfilled track color (default muted) */
  maximumTrackColor?: string;
  /** Thumb color (default white) */
  thumbColor?: string;
  /** Track height in pixels (default 4) */
  height?: number;
  /** Whether to show the thumb circle (default true) */
  showThumb?: boolean;
  /** Thumb diameter override (default height × 5, min 20) */
  thumbSize?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  onValueChange,
  onSlidingComplete,
  minimumTrackColor: minimumTrackColorProp,
  maximumTrackColor = withOpacity(textColors.muted, 0.35),
  thumbColor = '#FFFFFF',
  height = 4,
  showThumb = true,
  thumbSize: thumbSizeProp,
  disabled = false,
  style,
}) => {
  const { accentColor: storeAccentColor } = useSettingsStore();
  const minimumTrackColor = minimumTrackColorProp || storeAccentColor;

  const trackWidth = useRef(0);
  const thumbDiameter = thumbSizeProp ?? Math.max(height * 5, 20);
  const thumbRadius = thumbDiameter / 2;

  // Shared values
  const progress = useSharedValue(value);
  const thumbScale = useSharedValue(1);
  const isDragging = useRef(false);

  // Keep progress in sync with external value when not dragging
  React.useEffect(() => {
    if (!isDragging.current) {
      progress.value = withTiming(value, { duration: 120 });
    }
  }, [value, progress]);

  // Clamp helper
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  // Emit value change (called from JS thread)
  const emitChange = useCallback(
    (v: number) => {
      onValueChange?.(v);
    },
    [onValueChange],
  );

  const emitComplete = useCallback(
    (v: number) => {
      onSlidingComplete?.(v);
    },
    [onSlidingComplete],
  );

  // ── PanResponder ─────────────────────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,

        onPanResponderGrant: (evt) => {
          isDragging.current = true;
          thumbScale.value = withSpring(1.25, { damping: 12, stiffness: 300 });

          const locationX = evt.nativeEvent.locationX;
          const newVal = clamp(locationX / trackWidth.current, 0, 1);
          progress.value = newVal;
          runOnJS(emitChange)(newVal);
        },

        onPanResponderMove: (_evt, gestureState) => {
          // Compute new progress from the cumulative dx
          const startX = progress.value * trackWidth.current;
          const currentX = startX + gestureState.dx;
          const newVal = clamp(currentX / trackWidth.current, 0, 1);
          // Only update if change is meaningful to avoid excessive re-renders
          progress.value = newVal;
          runOnJS(emitChange)(newVal);
        },

        onPanResponderRelease: () => {
          isDragging.current = false;
          thumbScale.value = withSpring(1, { damping: 14, stiffness: 200 });
          runOnJS(emitComplete)(progress.value);
        },

        onPanResponderTerminate: () => {
          isDragging.current = false;
          thumbScale.value = withSpring(1, { damping: 14, stiffness: 200 });
        },
      }),
    [disabled, emitChange, emitComplete, progress, thumbScale],
  );

  // ── Layout ───────────────────────────────────────────────────────────
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  }, []);

  // ── Animated styles ──────────────────────────────────────────────────
  const filledTrackStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
    transform: [
      { translateX: -thumbRadius },
      { scale: thumbScale.value },
    ],
  }));

  // ── Render ───────────────────────────────────────────────────────────
  const trackRadius = height / 2;
  const touchTargetHeight = Math.max(thumbDiameter + 16, 44); // Accessibility: min 44px

  return (
    <View
      style={[
        styles.wrapper,
        { height: touchTargetHeight, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
      {...panResponder.panHandlers}
      onLayout={handleLayout}
    >
      {/* Background track */}
      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: trackRadius,
            backgroundColor: maximumTrackColor,
          },
        ]}
      >
        {/* Filled track */}
        <Animated.View
          style={[
            styles.filledTrack,
            {
              height,
              borderRadius: trackRadius,
              backgroundColor: minimumTrackColor,
            },
            filledTrackStyle,
          ]}
        />
      </View>

      {/* Thumb */}
      {showThumb && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbDiameter,
              height: thumbDiameter,
              borderRadius: thumbRadius,
              backgroundColor: thumbColor,
              top: (touchTargetHeight - thumbDiameter) / 2,
            },
            shadows.glass,
            thumbAnimatedStyle,
          ]}
        >
          {/* Inner dot */}
          <View
            style={[
              styles.thumbInner,
              {
                width: thumbDiameter * 0.4,
                height: thumbDiameter * 0.4,
                borderRadius: thumbDiameter * 0.2,
                backgroundColor: minimumTrackColor,
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  filledTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle border for glass effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  thumbInner: {
    // Accent-colored dot inside the thumb
  },
});

export default CustomSlider;
