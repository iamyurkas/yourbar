import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { withAlpha } from "../utils/color";
import {
  selectors,
  toggleInBar as toggleInBarAction,
  toggleInShopping as toggleInShoppingAction,
} from "../state/ingredients.store";
import { ENABLE_FLAG_INSTRUMENTATION } from "../constants/featureFlags";

export const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;
export const INGREDIENT_ROW_HEIGHT =
  ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;

type IngredientRowProps = {
  id: string | number;
  name: string;
  photoUri?: string | null;
  tags?: Array<{ id: string; color: string }> | null;
  usageCount: number;
  singleCocktailName?: string | null;
  showMake?: boolean;
  inBar?: boolean;
  inShoppingList?: boolean;
  baseIngredientId?: string | number | null;
  onPress: (id: string | number) => void;
  onDetails?: (id: string | number) => void;
  onToggleInBar?: (id: string | number) => void;
  onToggleShoppingList?: (id: string | number) => void;
  onRemove?: (id: string | number) => void;
  isNavigating?: boolean;
  highlightColor?: string;
};

type FlagPillProps = {
  active: boolean;
  iconActive: string;
  iconInactive: string;
  colorActive: string;
  colorInactive: string;
  onPress: () => void;
};

const FlagPill = memo(function FlagPill({
  active,
  iconActive,
  iconInactive,
  colorActive,
  colorInactive,
  onPress,
}: FlagPillProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      android_ripple={{ borderless: true }}
      style={({ pressed }) => [
        styles.checkButton,
        pressed && styles.pressedCheck,
      ]}
    >
      <MaterialIcons
        name={active ? iconActive : iconInactive}
        size={22}
        color={active ? colorActive : colorInactive}
      />
    </Pressable>
  );
});

const areRowPropsEqual = (prev: IngredientRowProps, next: IngredientRowProps) => {
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.photoUri === next.photoUri &&
    prev.usageCount === next.usageCount &&
    prev.singleCocktailName === next.singleCocktailName &&
    prev.showMake === next.showMake &&
    prev.baseIngredientId === next.baseIngredientId &&
    prev.onPress === next.onPress &&
    prev.onDetails === next.onDetails &&
    prev.onToggleInBar === next.onToggleInBar &&
    prev.onToggleShoppingList === next.onToggleShoppingList &&
    prev.onRemove === next.onRemove &&
    prev.isNavigating === next.isNavigating &&
    prev.highlightColor === next.highlightColor &&
    prev.tags === next.tags
  );
};

const IngredientRow = memo(function IngredientRow({
  id,
  name,
  photoUri,
  tags,
  usageCount,
  singleCocktailName,
  showMake,
  baseIngredientId,
  onPress,
  onDetails,
  onToggleInBar,
  onToggleShoppingList,
  onRemove,
  isNavigating,
  highlightColor,
}: IngredientRowProps) {
  const theme = useTheme();
  const stringId = useMemo(() => String(id), [id]);
  const inBar = selectors.useInBar(stringId);
  const inShopping = selectors.useInShopping(stringId);

  const handlePress = useCallback(() => onPress(id), [onPress, id]);

  const handleToggleInBar = useCallback(() => {
    if (onToggleInBar) onToggleInBar(id);
    else toggleInBarAction(stringId);
  }, [id, onToggleInBar, stringId]);

  const handleToggleShopping = useCallback(() => {
    if (onToggleShoppingList) onToggleShoppingList(id);
    else toggleInShoppingAction(stringId);
  }, [id, onToggleShoppingList, stringId]);

  const handleRemove = useCallback(() => {
    onRemove?.(id);
  }, [id, onRemove]);

  const ripple = useMemo(
    () => ({ color: withAlpha(theme.colors.tertiary, 0.35) }),
    [theme.colors.tertiary]
  );

  const renderCountRef = useRef(0);
  useEffect(() => {
    if (__DEV__ && ENABLE_FLAG_INSTRUMENTATION) {
      renderCountRef.current += 1;
      if (renderCountRef.current > 1) {
        console.log(
          `[IngredientRow] re-render ${renderCountRef.current} times for ${stringId}`
        );
      }
    }
  });

  const isBranded = baseIngredientId != null;

  return (
    <View
      style={[
        inBar ? styles.highlightWrapper : styles.normalWrapper,
        { borderBottomColor: theme.colors.background },
        inBar && { backgroundColor: withAlpha(theme.colors.secondary, 0.25) },
        highlightColor && { backgroundColor: highlightColor },
      ]}
    >
      <View
        style={[
          styles.item,
          isBranded && {
            ...styles.brandedStripe,
            borderLeftColor: theme.colors.primary,
          },
          !inBar && !highlightColor && styles.dimmed,
          isNavigating && {
            ...styles.navigatingRow,
            backgroundColor: withAlpha(theme.colors.tertiary, 0.3),
          },
        ]}
      >
        {inShopping && !onToggleShoppingList && !onRemove && (
          <MaterialIcons
            name="shopping-cart"
            size={16}
            color={theme.colors.primary}
            style={styles.cartIcon}
          />
        )}

        <Pressable
          onPress={handlePress}
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

        {onDetails && (
          <Pressable
            onPress={() => onDetails(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [styles.checkButton, pressed && styles.pressedCheck]}
          >
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
        )}

        {onRemove ? (
          <FlagPill
            active={inShopping}
            iconActive="remove-shopping-cart"
            iconInactive="add-shopping-cart"
            colorActive={theme.colors.error}
            colorInactive={theme.colors.onSurfaceVariant}
            onPress={handleRemove}
          />
        ) : onToggleShoppingList ? (
          <FlagPill
            active={inShopping}
            iconActive="shopping-cart"
            iconInactive="add-shopping-cart"
            colorActive={theme.colors.primary}
            colorInactive={theme.colors.onSurfaceVariant}
            onPress={handleToggleShopping}
          />
        ) : (
          <FlagPill
            active={inBar}
            iconActive="check-circle"
            iconInactive="radio-button-unchecked"
            colorActive={theme.colors.primary}
            colorInactive={theme.colors.onSurfaceVariant}
            onPress={handleToggleInBar}
          />
        )}
      </View>
    </View>
  );
}, areRowPropsEqual);

export default IngredientRow;

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
});

