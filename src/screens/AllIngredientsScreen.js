import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  memo,
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

// ---- Рядок списку ----
const ItemRow = memo(function ItemRow({
  item,
  onPress,
  onToggleInBar,
  navigatingId,
}) {
  const isBranded = !!item.baseIngredientId;
  const inBar = item?.inBar === true;
  const isNavigating = navigatingId === item.id;

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
        {item.inShoppingList && (
          <MaterialIcons
            name="shopping-cart"
            size={16}
            color="#4DABF7"
            style={styles.cartIcon}
          />
        )}

        {/* Ліва зона — відкриття деталей */}
        <Pressable
          onPress={() => onPress(item.id)}
          android_ripple={{ color: "#E3F2FD" }}
          style={({ pressed }) => [
            styles.leftTapZone,
            pressed && styles.pressedLeft, // миттєвий відгук
          ]}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 8 }}
        >
          {item.photoUri ? (
            <Image
              source={{ uri: item.photoUri }}
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
              {item.name}
            </Text>
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
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
          onPress={() => onToggleInBar(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          android_ripple={{ color: "#E3F2FD", borderless: true }}
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
});

export default function AllIngredientsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null); // миттєва підсвітка рядка

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
    for (let i = 0; i < sorted.length; i++) {
      map.set(sorted[i].id, i);
    }
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

  const toggleInBar = useCallback(
    (id) => {
      const idx = indexMapRef.current.get(id);
      if (idx === undefined) return;

      // оптимістичне оновлення
      setIngredients((prev) => {
        if (!prev[idx]) return prev;
        const next = [...prev];
        const item = next[idx];
        const nextItem = { ...item, inBar: !item?.inBar };
        next[idx] = nextItem;
        return next;
      });

      // збереження у фоні
      const current = ingredients[indexMapRef.current.get(id)];
      const nextInBar = !current?.inBar;
      saveIngredient({ ...current, inBar: nextInBar }).catch((err) =>
        console.error("Save failed", err)
      );
    },
    [ingredients]
  );

  const onItemPress = useCallback(
    (id) => {
      // миттєвий візуальний фідбек до переходу
      setNavigatingId(id);
      navigation.navigate("Create", {
        screen: "IngredientDetails",
        params: { id },
      });
      // якщо екран лишається (наприклад, швидке повернення), приберемо стан через мить
      setTimeout(() => setNavigatingId(null), 600);
    },
    [navigation]
  );

  const filtered = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, searchDebounced]);

  const renderItem = useCallback(
    ({ item }) => (
      <ItemRow
        item={item}
        onPress={onItemPress}
        onToggleInBar={toggleInBar}
        navigatingId={navigatingId}
      />
    ),
    [onItemPress, toggleInBar, navigatingId]
  );

  const keyExtractor = useCallback(
    (item, i) => String(item?.id ?? `${item?.name ?? "item"}-${i}`),
    []
  );

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
        estimatedItemSize={ITEM_HEIGHT} // ⚡ Головне для швидкості
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
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
  pressedCheck: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
});
