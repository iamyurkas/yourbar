import React, { useContext } from "react";
import { View, Pressable, Text, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { TabSwipeContext } from "./TabSwipe";

export default function BottomTabBar({ state, descriptors, navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const swipe = useContext(TabSwipeContext) || { value: 0 };
  const width = Dimensions.get("window").width;
  const tabWidth = width / state.routes.length;
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
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.outline,
          paddingBottom: insets.bottom || 0,
        },
      ]}
    >
      {state.routes.map((route, idx) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;
        const isFocused = index === idx;
        const color = isFocused
          ? theme.colors.primary
          : theme.colors.onSurfaceVariant;
        const icon = options.tabBarIcon
          ? options.tabBarIcon({ color, size: 24 })
          : null;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            style={styles.tab}
          >
            {icon}
            <Text style={[styles.label, { color }]}>{label}</Text>
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
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  underline: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
  },
});

