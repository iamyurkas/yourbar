import React, { memo } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { withAlpha } from "../utils/color";

const TagPill = memo(function TagPill({
  id,
  name,
  color,
  onToggle,
  rippleColor,
  defaultColor,
  textColor,
}) {
  const theme = useTheme();
  const effectiveRipple = rippleColor ?? withAlpha(theme.colors.primary, 0.1);
  const background = color || defaultColor || theme.colors.surfaceVariant;
  const foreground =
    textColor ||
    (defaultColor ? theme.colors.onSecondary : theme.colors.onPrimary);

  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={{ color: effectiveRipple }}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: background },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.tagText, { color: foreground }]}>{name}</Text>
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
