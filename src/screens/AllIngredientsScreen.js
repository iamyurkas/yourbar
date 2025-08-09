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

// ---- Константи для лісту ----
const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;
const ITEM_HEIGHT = ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;
const RIPPLE = { color: "#E3F2FD" };

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
    const isBranded = !!baseIngredientId;

    return (
      <View style={inBar ? styles.highlightWrapper : styles.normalWrapper}>
        <View
          style={[
            styles.item,
            isBranded && styles.brandedStripe,
            !inBar && styles.dimmed,
            isNavigating && styles.navigatingRow, // миттєвий стан після тапу
          ]}
        >
          {inShoppingList && (
            <MaterialIcons
              name="shopping-cart"
              size={16}
              color="#4DABF7"
              style={styles.cartIcon}
            />
          )}

          {/* Ліва зона — відкриття деталей */}
          <Pressable
            onPress={() => onPress(id)}
            android_ripple={RIPPLE}
            style={({ pressed }) => [
              styles.leftTapZone,
              pressed && styles.pressedLeft, // миттєвий відгук
            ]}
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 8 }}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text numberOfLines={1} style={styles.name}>
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
            android_ripple={{ ...RIPPLE, borderless: true }}
            style={({ pressed }) => [
              styles.checkButton,
              pressed && styles.pressedCheck,
            ]}
          >
            <MaterialIcons
              name={inBar ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={inBar ? "#4DABF7" : "#999"}
            />
          </Pressable>
        </View>
      </View>
    );
  },
  // 🔒 ререндер тільки при реальній зміні відображуваних полів
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.photoUri === next.photoUri &&
    prev.inBar === next.inBar &&
    prev.inShoppingList === next.inShoppingList &&
    prev.baseIngredientId === next.baseIngredientId &&
    prev.isNavigating === next.isNavigating &&
    // shallow-порівняння масиву тегів (посилання), щоб не дорого
    prev.tags === next.tags
);

export default function AllIngredientsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null); // миттєва підсвітка рядка

  // ⚠️ уникаємо повторного setTab
  const didSetTabRef = useRef(false);
  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("ingredients", "All");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  // мапа id -> index
  const indexMapRef = useRef(new Map());

  const sortIngredients = useCallback((data) => {
    // сортуємо 1 раз при завантаженні
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

  // 🔔 легкий debounce на пошуку
  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // ⏳ відкладений рендер відфільтрованого списку (React 18)
  const deferredSearch = useDeferredValue(searchDebounced);

  // ✅ Функціональний toggle без залежності від зовнішнього `ingredients`
  // + батчинг записів у сховище
  const pendingSaveRef = useRef(new Map()); // id -> latestValue
  const flushTimerRef = useRef(null);

  const flushSaves = useCallback(() => {
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = new Map();
    flushTimerRef.current = null;

    if (pending.size === 0) return;
    // зберігаємо пачкою, але окремими викликами API
    pending.forEach((inBar, id) => {
      const idx = indexMapRef.current.get(id);
      if (idx == null) return;
      const current = ingredients[idx];
      // якщо за час батчингу дані оновилися — підстрахуємось
      if (!current) return;
      saveIngredient({ ...current, inBar }).catch((err) =>
        console.error("Save failed", err)
      );
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

        // запис у чергу збереження
        pendingSaveRef.current.set(id, nextInBar);
        scheduleFlush();

        return next;
      });
    },
    [scheduleFlush]
  );

  const onItemPress = useCallback(
    (id) => {
      setNavigatingId(id); // миттєва підсвітка
      navigation.navigate("Create", {
        screen: "IngredientDetails",
        params: { id },
      });
      // запасний таймер — на випадок швидкого повернення
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
    // при розмонтуванні — доженемо незбережені записи
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
      // синхронно флашнемо, щоб нічого не втратити
      // (у реальному проді можна лишити як є, якщо це не критично)
      // викликати прямо тут не можемо, бо залежить від state — просто прогорнемо мапу
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
        <ActivityIndicator size="large" color="#4DABF7" />
        <Text style={{ marginTop: 12 }}>Loading ingredients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={12}
        getItemType={() => "ING"} // допомагає реюзу типів елементів
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text>No ingredients found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "white" },
  listContent: { backgroundColor: "white" },

  highlightWrapper: {
    backgroundColor: "#E3F2FD",
    borderBottomWidth: ROW_BORDER,
    borderBottomColor: "#fff",
  },
  normalWrapper: {
    borderBottomWidth: ROW_BORDER,
    borderBottomColor: "#fff",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
  },
  dimmed: { opacity: 0.88 },

  // миттєва підсвітка рядка під час навігації
  navigatingRow: {
    opacity: 0.6,
    backgroundColor: "#F0F7FF",
  },

  leftTapZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  // стиль під час натиснення (Pressable)
  pressedLeft: {
    opacity: 0.7,
    transform: [{ scale: Platform.OS === "ios" ? 0.98 : 0.99 }],
  },

  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#999", fontSize: 10, textAlign: "center" },

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
    borderLeftColor: "green",
    paddingLeft: 4,
  },

  checkButton: { marginLeft: 8, paddingVertical: 6, paddingHorizontal: 4 },
  pressedCheck: { opacity: 0.7, transform: [{ scale: 0.92 }] },
});
