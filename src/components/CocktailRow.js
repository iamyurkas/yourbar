import React, { memo, useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { getGlassById } from "../constants/glassware";

const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

export const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;
export const COCKTAIL_ROW_HEIGHT =
  ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;

function CocktailRow({
  id,
  name,
  photoUri,
  glassId,
  tags,
  ingredientLine,
  rating,
  isAllAvailable,
  hasBranded,
  onPress,
  isNavigating,
}) {
  const theme = useTheme();
  const ripple = useMemo(
    () => ({ color: withAlpha(theme.colors.tertiary, 0.35) }),
    [theme.colors.tertiary]
  );
  const glassImage = glassId ? getGlassById(glassId)?.image : null;
  const backgroundColor = isAllAvailable
    ? withAlpha(theme.colors.secondary, 0.25)
    : theme.colors.background;
  return (
    <View
      style={[
        styles.wrapper,
        { borderBottomColor: theme.colors.background, backgroundColor },
      ]}
    >
      <Pressable
        onPress={() => onPress(id)}
        android_ripple={ripple}
        style={({ pressed }) => [
          styles.item,
          hasBranded && {
            ...styles.brandedStripe,
            borderLeftColor: theme.colors.primary,
          },
          !isAllAvailable && styles.dimmed,
          isNavigating && {
            ...styles.navigatingRow,
            backgroundColor: withAlpha(theme.colors.tertiary, 0.3),
          },
          pressed && styles.pressed,
        ]}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.image, { backgroundColor: theme.colors.background }]}
            resizeMode="cover"
          />
        ) : glassImage ? (
          <Image
            source={glassImage}
            style={[styles.image, { backgroundColor: theme.colors.background }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.placeholder,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[
                styles.placeholderText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No image
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: theme.colors.onSurface }]}
          >
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.ingredients, { color: theme.colors.onSurfaceVariant }]}
          >
            {ingredientLine || "\u00A0"}
          </Text>
        </View>
        {Array.isArray(tags) && tags.length > 0 && (
          <View style={styles.tagDots}>
            {tags.map((tag, idx) => (
              <View
                key={tag.id}
                style={[
                  styles.tagDot,
                  idx === 0 && styles.firstTagDot,
                  { backgroundColor: tag.color },
                ]}
              />
            ))}
          </View>
        )}
        {rating > 0 && (
          <View style={styles.rating}>
            {Array.from({ length: Math.round(rating) }).map((_, i) => (
              <MaterialIcons
                key={i}
                name="star"
                size={10}
                color={theme.colors.secondary}
              />
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default memo(CocktailRow);

const styles = StyleSheet.create({
  wrapper: { borderBottomWidth: ROW_BORDER },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
  },
  dimmed: { opacity: 0.88 },
  navigatingRow: { opacity: 0.6 },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: Platform.OS === "ios" ? 0.98 : 0.99 }],
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    aspectRatio: 1,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },
  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16 },
  ingredients: { fontSize: 12, marginTop: 4 },
  tagDots: { flexDirection: "row", alignSelf: "flex-start" },
  tagDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  firstTagDot: { marginLeft: 0 },
  rating: { position: "absolute", bottom: 4, right: 4, flexDirection: "row" },
  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
});
