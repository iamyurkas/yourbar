import React from "react";
import { View, StyleSheet } from "react-native";

export default function TinyDivider({ color, style }) {
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: color,
          opacity: 0.5,
        },
        style,
      ]}
    />
  );
}

