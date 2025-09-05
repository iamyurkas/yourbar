import React from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { withAlpha } from "../utils/color";

export default function SaveButton({ title, saving, onPress }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={saving}
      android_ripple={{ color: withAlpha(theme.colors.onPrimary, 0.15) }}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          opacity: saving ? 0.7 : 1,
        },
      ]}
    >
      <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
        {title}
      </Text>
      {saving && (
        <ActivityIndicator
          size="small"
          color={theme.colors.onPrimary}
          style={{ marginLeft: 8 }}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
