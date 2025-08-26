import React from "react";
import { View, StyleSheet } from "react-native";

/**
 * A tiny divider with hairline height and customizable color.
 * Accepts optional `style` to extend or override default styles.
 */
const TinyDivider = ({ color, style }) => (
  <View
    style={[
      styles.divider,
      color != null && { backgroundColor: color },
      style,
    ]}
  />
);

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});

export default TinyDivider;
