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
} from "../storage/ingredientsStorage";
import HeaderWithSearch from "../components/HeaderWithSearch";
import { useTabMemory } from "../context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

// ---- Helpers ----
const withAlpha = (hex, alpha) => {
  // hex = #RRGGBB -> #RRGGBBAA
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
    inBar,
    inShoppingList,
    baseIngredientId,
    onPress,
    onToggleInBar,
    isNavigating,
  }) {
    const theme = useTheme();
    const isBranded = !!baseIngredientId;

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

          {/* Ліва зона — відкриття деталей */}
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
              {Array.isArray(tags) && tags.length > 0 && (
                <View style={styles.tagRow}>
                  {tags.map((tag) => (
                    <View
                      key={tag.id}
                      style={[styles.tag, { backgroundColor: tag.color }]}
                    >
                      <Text style={styles.tagText}>{tag.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Pressable>

          {/* Чекбокс — оптимістичний апдейт + прес-ефект */}
          <Pressable
            onPress={() => onToggleInBar(id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ ...ripple, borderless: true }}
            style={({ pressed }) => [
              styles.checkButton,
              pressed && styles.pressedCheck,
            ]}
          >
            <MaterialIcons
              name={inBar ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={
                inBar ? theme.colors.primary : theme.colors.onSurfaceVariant
              }
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
    prev.inShoppingList === next.inShoppingList &&
    prev.baseIngredientId === next.baseIngredientId &&
    prev.isNavigating === next.isNavigating &&
    prev.tags === next.tags
);

export default function AllIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);

  const didSetTabRef = useRef(false);
  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("ingredients", "All");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  const indexMapRef = useRef(new Map());

  const sortIngredients = useCallback((data) => {
    return [...data].sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
  }, []);

  const loadIngredients = useCallback(async () => {
    const data = await getAllIngredients();
    const sorted = sortIngredients(data);
    setIngredients(sorted);
    const map = new Map();
    for (let i = 0; i < sorted.length; i++) map.set(sorted[i].id, i);
    indexMapRef.current = map;
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

  // батчинг збережень
  const pendingSaveRef = useRef(new Map());
  const flushTimerRef = useRef(null);

  const flushSaves = useCallback(() => {
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = new Map();
    flushTimerRef.current = null;
    if (pending.size === 0) return;

    pending.forEach((inBar, id) => {
      const idx = indexMapRef.current.get(id);
      if (idx == null) return;
      const current = ingredients[idx];
      if (!current) return;
      saveIngredient({ ...current, inBar }).catch(() => {});
    });
  }, [ingredients]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushSaves, 200);
  }, [flushSaves]);

  const toggleInBar = useCallback(
    (id) => {
      setIngredients((prev) => {
        const idx = indexMapRef.current.get(id);
        if (idx === undefined || !prev[idx]) return prev;
        const next = [...prev];
        const item = next[idx];
        const nextInBar = !item?.inBar;
        next[idx] = { ...item, inBar: nextInBar };
        pendingSaveRef.current.set(id, nextInBar);
        scheduleFlush();
        return next;
      });
    },
    [scheduleFlush]
  );

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

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, deferredSearch]);

  const renderItem = useCallback(
    ({ item }) => (
      <ItemRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        tags={item.tags}
        inBar={item.inBar === true}
        inShoppingList={item.inShoppingList === true}
        baseIngredientId={item.baseIngredientId}
        onPress={onItemPress}
        onToggleInBar={toggleInBar}
        isNavigating={navigatingId === item.id}
      />
    ),
    [onItemPress, toggleInBar, navigatingId]
  );

  const keyExtractor = useCallback(
    (item, i) => String(item?.id ?? `${item?.name ?? "item"}-${i}`),
    []
  );

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = new Map();
      pending.forEach((inBar, id) => {
        const idx = indexMapRef.current.get(id);
        if (idx == null) return;
        const current = ingredients[idx];
        if (!current) return;
        saveIngredient({ ...current, inBar }).catch(() => {});
      });
    };
  }, [ingredients]);

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
        onFilter={() => console.log("Open filter")}
      />

      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={ITEM_HEIGHT}
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: theme.colors.background },
        ]}
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
  listContent: {},

  highlightWrapper: {
    borderBottomWidth: ROW_BORDER,
  },
  normalWrapper: {
    borderBottomWidth: ROW_BORDER,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
  },
  dimmed: { opacity: 0.88 },

  navigatingRow: {
    opacity: 0.6,
  },

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
  name: { fontSize: 16, fontWeight: "bold" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { fontSize: 10, color: "white", fontWeight: "bold" },

  cartIcon: { position: "absolute", bottom: 4, right: 36, zIndex: 1 },
  brandedStripe: {
    borderLeftWidth: 4,
    paddingLeft: 4,
  },

  checkButton: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 4 },
  pressedCheck: { opacity: 0.7, transform: [{ scale: 0.92 }] },
});
