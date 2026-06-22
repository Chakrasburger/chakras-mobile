/**
 * AnimatedList — FlatList wrapper with staggered item entry animations
 * Each item fades in and slides up with configurable stagger delay
 * Uses react-native-reanimated entering animations (FadeInDown)
 */

import React, { useCallback } from 'react';
import {
  FlatList,
  FlatListProps,
  ListRenderItem,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimatedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  /** The render function for each item (same API as FlatList) */
  renderItem: ListRenderItem<T>;
  /** Stagger delay between each item's animation in ms (default 50) */
  animationDelay?: number;
  /** Base animation duration per item in ms (default 350) */
  animationDuration?: number;
  /** Max number of items to animate (items beyond this appear instantly). Default 20 */
  maxAnimatedItems?: number;
  /** Initial vertical offset for the slide-up in pixels (default 24) */
  slideOffset?: number;
}

// ---------------------------------------------------------------------------
// Animated item wrapper
// ---------------------------------------------------------------------------

interface AnimatedItemProps {
  index: number;
  delay: number;
  duration: number;
  maxAnimated: number;
  slideOffset: number;
  children: React.ReactNode;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({
  index,
  delay,
  duration,
  maxAnimated,
  slideOffset,
  children,
}) => {
  // Skip animation for items beyond the threshold (performance)
  if (index >= maxAnimated) {
    return <View>{children}</View>;
  }

  const entering = FadeInDown
    .delay(index * delay)
    .duration(duration)
    .springify()
    .damping(18)
    .stiffness(100);

  return (
    <Animated.View entering={entering}>
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AnimatedListInner<T>(
  {
    renderItem,
    animationDelay = 50,
    animationDuration = 350,
    maxAnimatedItems = 20,
    slideOffset = 24,
    ...flatListProps
  }: AnimatedListProps<T>,
  ref: React.Ref<FlatList<T>>,
) {
  const wrappedRenderItem: ListRenderItem<T> = useCallback(
    (info) => {
      const rendered = renderItem(info);
      return (
        <AnimatedItem
          index={info.index}
          delay={animationDelay}
          duration={animationDuration}
          maxAnimated={maxAnimatedItems}
          slideOffset={slideOffset}
        >
          {rendered}
        </AnimatedItem>
      );
    },
    [renderItem, animationDelay, animationDuration, maxAnimatedItems, slideOffset],
  );

  return (
    <FlatList<T>
      ref={ref}
      {...flatListProps}
      renderItem={wrappedRenderItem}
      // Ensure smooth scrolling performance
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={10}
    />
  );
}

// Forward ref with generics
const AnimatedList = React.forwardRef(AnimatedListInner) as <T>(
  props: AnimatedListProps<T> & { ref?: React.Ref<FlatList<T>> },
) => React.ReactElement;

export default AnimatedList;
