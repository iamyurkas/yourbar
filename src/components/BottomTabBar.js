import React, { useContext } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { BottomTabBar as RNBottomTabBar } from "@react-navigation/bottom-tabs";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTheme } from "react-native-paper";
import { TabSwipeContext } from "./TabSwipe";

export default function BottomTabBar(props) {
  const theme = useTheme();
  const { state } = props;
  const swipe = useContext(TabSwipeContext) || { value: 0 };
  const tabCount = state.routes.length;
  const width = Dimensions.get("window").width;
  const tabWidth = width / tabCount;
  const index = state.index;

  const overlineStyle = useAnimatedStyle(
    () => {
      const offset = Math.max(-tabWidth, Math.min(tabWidth, -swipe.value));
      return {
        transform: [{ translateX: tabWidth * index + offset }],
      };
    },
    [index, tabWidth, swipe]
  );

  return (
    <View style={styles.container}>
      <RNBottomTabBar {...props} />
      <Animated.View
        style={[
          styles.overline,
          { width: tabWidth, backgroundColor: theme.colors.primary },
          overlineStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative" },
  overline: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
  },
});
