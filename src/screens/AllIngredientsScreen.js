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
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
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

      setIngredients((prev) => {
        if (!prev[idx]) return prev;
        const next = [...prev];
        const item = next[idx];
        const nextItem = { ...item, inBar: !item?.inBar };
        next[idx] = nextItem;
        return next;
      });

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
      navigation.navigate("Create", {
        screen: "IngredientDetails",
        params: { id },
      });
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
      <ItemRow item={item} onPress={onItemPress} onToggleInBar={toggleInBar} />
    ),
    [onItemPress, toggleInBar]
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
});
