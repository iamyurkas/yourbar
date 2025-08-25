import React, { memo } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { useTheme, Text as PaperText } from "react-native-paper";
import { withAlpha } from "../utils/color";

export const INGREDIENT_BASE_ROW_HEIGHT = 56;

const IngredientBaseRow = memo(function IngredientBaseRow({
  id,
  name,
  photoUri,
  onSelect,
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(id)}
      android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.96, transform: [{ scale: 0.997 }] },
      ]}
    >
      <View style={styles.inner}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.img, { backgroundColor: theme.colors.background }]}
          />
        ) : (
          <View
            style={[styles.img, { backgroundColor: theme.colors.surfaceVariant }]}
          />
        )}
        <PaperText numberOfLines={1}>{name}</PaperText>
      </View>
    </Pressable>
  );
});

export default IngredientBaseRow;

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 8 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  img: {
    width: 40,
    height: 40,
    aspectRatio: 1,
    borderRadius: 8,
    resizeMode: "contain",
  },
});
