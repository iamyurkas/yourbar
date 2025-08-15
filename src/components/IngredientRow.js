import React, { memo, useMemo } from "react";
import { View, Text, Image, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

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
export const INGREDIENT_ROW_HEIGHT =
  ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;

function IngredientRow({
  id,
  name,
  photoUri,
  tags,
  usageCount,
  singleCocktailName,
  showMake,
  inBar,
  inShoppingList,
  baseIngredientId,
  onPress,
  onToggleInBar,
  onToggleShoppingList,
  onRemove,
  isNavigating,
}) {
  const theme = useTheme();
  const isBranded = baseIngredientId != null;

  const ripple = useMemo(
    () => ({ color: withAlpha(theme.colors.tertiary, 0.35) }),
    [theme.colors.tertiary]
  );

  return (
    <View
      style={[
        inBar ? styles.highlightWrapper : styles.normalWrapper,
        { borderBottomColor: theme.colors.background },
        inBar && { backgroundColor: withAlpha(theme.colors.secondary, 0.25) },
      ]}
    >
      <View
        style={[
          styles.item,
          isBranded && {
            ...styles.brandedStripe,
            borderLeftColor: theme.colors.primary,
          },
          !inBar && styles.dimmed,
          isNavigating && {
            ...styles.navigatingRow,
            backgroundColor: withAlpha(theme.colors.tertiary, 0.3),
          },
        ]}
      >
        {inShoppingList && (
          <MaterialIcons
            name="shopping-cart"
            size={16}
            color={theme.colors.primary}
            style={styles.cartIcon}
          />
        )}

        <Pressable
          onPress={() => onPress(id)}
          android_ripple={ripple}
          style={({ pressed }) => [styles.leftTapZone, pressed && styles.pressedLeft]}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 8 }}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[styles.image, { backgroundColor: theme.colors.background }]}
              resizeMode="contain"
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
                style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}
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
              style={[styles.usage, { color: theme.colors.onSurfaceVariant }]}
            >
              {usageCount > 0
                ? usageCount === 1
                  ? showMake
                    ? `Make ${singleCocktailName || "1 cocktail"}`
                    : singleCocktailName || "1 cocktail"
                  : showMake
                  ? `Make ${usageCount} cocktails`
                  : `${usageCount} cocktails`
                : "\u00A0"}
            </Text>
          </View>
        </Pressable>

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

        {onRemove ? (
          <Pressable
            onPress={() => onRemove(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressedRemove]}
          >
            <MaterialIcons
              name="remove-shopping-cart"
              size={22}
              color={theme.colors.error}
            />
          </Pressable>
        ) : onToggleInBar ? (
          <Pressable
            onPress={() => onToggleInBar(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [styles.checkButton, pressed && styles.pressedCheck]}
          >
            <MaterialIcons
              name={inBar ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={inBar ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          </Pressable>
        ) : onToggleShoppingList ? (
          <Pressable
            onPress={() => onToggleShoppingList(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [styles.checkButton, pressed && styles.pressedCheck]}
          >
            <MaterialIcons
              name={inShoppingList ? "shopping-cart" : "add-shopping-cart"}
              size={22}
              color={
                inShoppingList
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default memo(IngredientRow);

const styles = StyleSheet.create({
  highlightWrapper: { borderBottomWidth: ROW_BORDER },
  normalWrapper: { borderBottomWidth: ROW_BORDER },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
    height: INGREDIENT_ROW_HEIGHT - ROW_BORDER,
  },
  dimmed: { opacity: 0.88 },
  navigatingRow: { opacity: 0.6 },
  leftTapZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  pressedLeft: {
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
  usage: { fontSize: 12, marginTop: 4 },
  tagDots: { flexDirection: "row", marginRight: 8, alignSelf: "flex-start" },
  tagDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  firstTagDot: { marginLeft: 0 },
  cartIcon: { position: "absolute", bottom: 4, right: 60, zIndex: 1 },
  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
  checkButton: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 4 },
  pressedCheck: { opacity: 0.7, transform: [{ scale: 0.92 }] },
  removeButton: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 4 },
  pressedRemove: { opacity: 0.7, transform: [{ scale: 0.92 }] },
});
