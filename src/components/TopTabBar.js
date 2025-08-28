import React, { useContext } from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { TabSwipeContext } from "./TabSwipe";

export const TOP_TAB_BAR_HEIGHT = 48;

export default function TopTabBar({ navigation, theme }) {
  const state = navigation.getState();
  const swipe = useContext(TabSwipeContext) || { value: 0 };
  const tabCount = state.routes.length;
  const width = Dimensions.get("window").width;
  const tabWidth = width / tabCount;
  const index = state.index;

  const underlineStyle = useAnimatedStyle(
    () => {
      const offset = Math.max(-tabWidth, Math.min(tabWidth, -swipe.value));
      return {
        transform: [{ translateX: tabWidth * index + offset }],
      };
    },
    [index, tabWidth, swipe]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      {state.routes.map((route, idx) => {
        const isFocused = index === idx;
        const color = isFocused
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            style={styles.tab}
          >
            <Text style={{ color }}>{route.name}</Text>
          </Pressable>
        );
      })}
      <Animated.View
        style={[
          styles.underline,
          { width: tabWidth, backgroundColor: theme.colors.primary },
          underlineStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: TOP_TAB_BAR_HEIGHT,
    elevation: 4,
    zIndex: 1,
    // remove bottom divider so active underline sits at the very bottom
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
  },
});
