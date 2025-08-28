import React from "react";
import { Dimensions } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { runOnJS, useSharedValue } from "react-native-reanimated";

export const TabSwipeContext = React.createContext(null);

const UNDERLINE_MOVE_THRESHOLD = 20;
const NAVIGATE_THRESHOLD = 80;

export default function TabSwipe({ navigation, children }) {
  const swipeOffset = useSharedValue(0);
  const screenWidth = Dimensions.get("window").width;

  const goNext = React.useCallback(() => {
    const state = navigation.getState();
    const index = state.index;
    if (index < state.routes.length - 1) {
      navigation.navigate(state.routes[index + 1].name);
    }
  }, [navigation]);

  const goPrev = React.useCallback(() => {
    const state = navigation.getState();
    const index = state.index;
    if (index > 0) {
      navigation.navigate(state.routes[index - 1].name);
    }
  }, [navigation]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const t = e.translationX;
      if (Math.abs(t) > UNDERLINE_MOVE_THRESHOLD) {
        const dir = t > 0 ? 1 : -1;
        const offset = t - dir * UNDERLINE_MOVE_THRESHOLD;
        const max = screenWidth;
        swipeOffset.value = Math.max(-max, Math.min(max, offset));
      } else {
        swipeOffset.value = 0;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -NAVIGATE_THRESHOLD) {
        runOnJS(goNext)();
      } else if (e.translationX > NAVIGATE_THRESHOLD) {
        runOnJS(goPrev)();
      }
      swipeOffset.value = 0;
    });

  return (
    <TabSwipeContext.Provider value={swipeOffset}>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ flex: 1 }}>{children}</Animated.View>
      </GestureDetector>
    </TabSwipeContext.Provider>
  );
}
