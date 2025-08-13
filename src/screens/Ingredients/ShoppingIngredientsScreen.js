import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  memo,
  useDeferredValue,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import {
  getAllIngredients,
  saveIngredient,
} from "../../storage/ingredientsStorage";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import { useTabMemory } from "../../context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import TagFilterMenu from "../../components/TagFilterMenu";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import { getAllTags } from "../../storage/ingredientTagsStorage";
import { getAllCocktails } from "../../storage/cocktailsStorage";

// ---- Helpers ----
const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

// ---- Константи для лісту ----
const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;
const ITEM_HEIGHT = ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;

// ---- Рядок списку ----
const ItemRow = memo(
  function ItemRow({
    id,
    name,
    photoUri,
    tags,
    usageCount,
    inBar,
    baseIngredientId,
    onPress,
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
          <Pressable
            onPress={() => onPress(id)}
            android_ripple={ripple}
            style={({ pressed }) => [
              styles.leftTapZone,
              pressed && styles.pressedLeft,
            ]}
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 8 }}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={[
                  styles.image,
                  { backgroundColor: theme.colors.background },
                ]}
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
                style={[
                  styles.usage,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {usageCount > 0
                  ? `${usageCount} cocktail${usageCount === 1 ? "" : "s"}`
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

          <Pressable
            onPress={() => onRemove(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.pressedRemove,
            ]}
          >
            <MaterialIcons
              name="remove-shopping-cart"
              size={22}
              color={theme.colors.error}
            />
          </Pressable>
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.photoUri === next.photoUri &&
    prev.inBar === next.inBar &&
    prev.baseIngredientId === next.baseIngredientId &&
    prev.isNavigating === next.isNavigating &&
    prev.tags === next.tags &&
    prev.usageCount === next.usageCount
);

export default function ShoppingIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  const didSetTabRef = useRef(false);
  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("ingredients", "Shopping");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = await getAllTags();
      if (!cancelled)
        setAvailableTags([
          ...BUILTIN_INGREDIENT_TAGS,
          ...(custom || []),
        ]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortIngredients = useCallback((data) => {
    return [...data].sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
  }, []);

  const loadIngredients = useCallback(async () => {
    const [data, cocktails] = await Promise.all([
      getAllIngredients(),
      getAllCocktails(),
    ]);
    const usage = {};
    cocktails.forEach((c) => {
      if (Array.isArray(c.ingredients)) {
        c.ingredients.forEach((ing) => {
          if (ing.ingredientId != null)
            usage[ing.ingredientId] = (usage[ing.ingredientId] || 0) + 1;
        });
      }
    });

    const filtered = data.filter((i) => i.inShoppingList === true);
    const sorted = sortIngredients(filtered).map((item) => ({
      ...item,
      searchName: item.name.toLowerCase(),
      usageCount: usage[item.id] || 0,
    }));
    setIngredients(sorted);
  }, [sortIngredients]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadIngredients();
      if (!cancelled) setLoading(false);
    };
    if (isFocused) run();
    return () => {
      cancelled = true;
    };
  }, [isFocused, loadIngredients]);

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const deferredSearch = useDeferredValue(searchDebounced);

  const onItemPress = useCallback(
    (id) => {
      setNavigatingId(id);
      navigation.navigate("Create", {
        screen: "IngredientDetails",
        params: { id },
      });
      setTimeout(() => setNavigatingId(null), 600);
    },
    [navigation]
  );

  const removeFromShoppingList = useCallback((id) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      const { searchName, usageCount, ...rest } = removed;
      saveIngredient({ ...rest, inShoppingList: false }).catch(() => {});
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    let data = ingredients;
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter((i) =>
        Array.isArray(i.tags) &&
        i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return data;
  }, [ingredients, deferredSearch, selectedTagIds]);

  const renderItem = useCallback(
    ({ item }) => (
      <ItemRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        tags={item.tags}
        usageCount={item.usageCount}
        inBar={item.inBar === true}
        baseIngredientId={item.baseIngredientId}
        onPress={onItemPress}
        onRemove={removeFromShoppingList}
        isNavigating={navigatingId === item.id}
      />
    ),
    [onItemPress, removeFromShoppingList, navigatingId]
  );

  const keyExtractor = useCallback(
    (item, i) => String(item?.id ?? `${item?.name ?? "item"}-${i}`),
    []
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.onSurface }}>
          Loading ingredients...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <HeaderWithSearch
        searchValue={search}
        setSearchValue={setSearch}
        onMenu={() => navigation.navigate("GeneralMenu")}
        filterComponent={
          <TagFilterMenu
            tags={availableTags}
            selected={selectedTagIds}
            setSelected={setSelectedTagIds}
          />
        }
      />

      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={ITEM_HEIGHT}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={12}
        getItemType={() => "ING"}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No ingredients found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },

  highlightWrapper: { borderBottomWidth: ROW_BORDER },
  normalWrapper: { borderBottomWidth: ROW_BORDER },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
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
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },

  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16 },
  usage: { fontSize: 12, marginTop: 4 },

  tagDots: { flexDirection: "row", marginRight: 8 },
  tagDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  firstTagDot: { marginLeft: 0 },

  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },

  removeButton: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 4 },
  pressedRemove: { opacity: 0.7, transform: [{ scale: 0.92 }] },
});

