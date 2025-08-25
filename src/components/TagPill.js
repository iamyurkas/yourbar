import React, { memo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { withAlpha } from "../utils/color";

const TagPill = memo(function TagPill({ id, name, color, onToggle }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={{ color: withAlpha(theme.colors.primary, 0.1) }}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: color || theme.colors.surfaceVariant },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{name}</Text>
    </Pressable>
  );
});

export default TagPill;

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: { fontWeight: "bold" },
});
