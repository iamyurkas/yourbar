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
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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
const ITEM_HEIGHT =
  ROW_VERTICAL * 2 + // paddingVertical
  Math.max(IMAGE_SIZE, 40) + // контент (по висоті тут визначає картинка)
  ROW_BORDER; // нижній бордер (вписуємо приблизно)

// ---- Рядок списку (мемоізований) ----
const ItemRow = memo(function ItemRow({ item, onPress, onToggleInBar }) {
  const isBranded = !!item.baseIngredientId;
  const inBar = item?.inBar === true;

  return (
    <View style={inBar ? styles.highlightWrapper : null}>
      <View
        style={[
          styles.item,
          isBranded && styles.brandedStripe,
          !inBar && styles.dimmed,
        ]}
      >
        {/* Shopping cart icon */}
        {item.inShoppingList && (
          <MaterialIcons
            name="shopping-cart"
            size={16}
            color="#4DABF7"
            style={styles.cartIcon}
          />
        )}

        <TouchableOpacity
          onPress={() => onPress(item.id)}
          activeOpacity={0.7}
          style={styles.leftTapZone}
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
        </TouchableOpacity>

        {/* Чекбокс праворуч */}
        <TouchableOpacity
          onPress={() => onToggleInBar(item.id)}
          style={styles.checkButton}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={inBar ? "check-circle" : "radio-button-unchecked"}
            size={22}
            color={inBar ? "#4DABF7" : "#999"}
          />
        </TouchableOpacity>
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

  // 1) Один раз встановлюємо таб
  const didSetTabRef = useRef(false);
  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("ingredients", "All");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  // 2) Індекс id -> index для O(1) оновлення
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
    // оновлюємо мапу індексів
    const map = new Map();
    for (let i = 0; i < sorted.length; i++) {
      map.set(sorted[i].id, i);
    }
    indexMapRef.current = map;
  }, [sortIngredients]);

  // 3) Початкове та фокусне завантаження
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

  // 4) Дебаунс пошуку
  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // 5) O(1) оптимістичний тумблер inBar
  const toggleInBar = useCallback(
    (id) => {
      // знаходимо індекс миттєво
      const idx = indexMapRef.current.get(id);
      if (idx === undefined) return;

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

  // 6) Натискання на рядок
  const onItemPress = useCallback(
    (id) => {
      navigation.navigate("Create", {
        screen: "IngredientDetails",
        params: { id },
      });
    },
    [navigation]
  );

  // 7) Мемо фільтрації
  const filtered = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, searchDebounced]);

  // 8) Рендер рядка — стабільний колбек
  const renderItem = useCallback(
    ({ item }) => (
      <ItemRow item={item} onPress={onItemPress} onToggleInBar={toggleInBar} />
    ),
    [onItemPress, toggleInBar]
  );

  // 9) Стабільний keyExtractor
  const keyExtractor = useCallback(
    (item, i) => String(item?.id ?? `${item?.name ?? "item"}-${i}`),
    []
  );

  // 10) Фіксована висота рядка — FlatList скаже «дякую»
  const getItemLayout = useCallback(
    (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
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

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        // Параметри продуктивності:
        initialNumToRender={20}
        maxToRenderPerBatch={24}
        updateCellsBatchingPeriod={16}
        windowSize={10}
        removeClippedSubviews
        getItemLayout={getItemLayout}
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
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    borderBottomWidth: ROW_BORDER,
    borderBottomColor: "#eee",
    position: "relative",
  },
  dimmed: { opacity: 0.88 },

  leftTapZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
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
  placeholderText: { color: "#999", fontSize: 10 },

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
});
