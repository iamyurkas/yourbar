import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TagFilterMenu from "../../components/TagFilterMenu";
import IngredientRow, {
  INGREDIENT_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/IngredientRow";
import { useTabMemory } from "../../context/TabMemoryContext";
import {
  getAllIngredients,
  saveIngredient,
} from "../../storage/ingredientsStorage";
import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { mapCocktailsByIngredient } from "../../utils/ingredientUsage";

export default function MyIngredientsScreen() {
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
      setTab("ingredients", "My");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = await getAllTags();
      if (!cancelled)
        setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...(custom || [])]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async () => {
    const [base, cocktails] = await Promise.all([
      getAllIngredients(),
      getAllCocktails(),
    ]);
    const sorted = [...base].sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
    const usageMap = mapCocktailsByIngredient(sorted, cocktails);
    const cocktailMap = new Map(cocktails.map((c) => [c.id, c.name]));
    return sorted.map((item) => {
      const ids = usageMap[item.id] || [];
      const usageCount = ids.length;
      const singleCocktailName =
        usageCount === 1 ? cocktailMap.get(ids[0]) : null;
      return {
        ...item,
        searchName: item.name.toLowerCase(),
        usageCount,
        singleCocktailName,
      };
    });
  }, []);

  useEffect(() => {
    let cancel = false;
    if (!isFocused) return;
    (async () => {
      const data = await loadData();
      if (cancel) return;
      setIngredients(data);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [isFocused, loadData]);

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  const filtered = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    let data = ingredients.filter((i) => i.inBar);
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter(
        (i) =>
          Array.isArray(i.tags) &&
          i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return data;
  }, [ingredients, searchDebounced, selectedTagIds]);

  const toggleInBar = useCallback((id) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const item = next[idx];
      const inBar = !item.inBar;
      next[idx] = { ...item, inBar };
      saveIngredient({ ...item, inBar }).catch(() => {});
      return next;
    });
  }, []);

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

  const renderItem = useCallback(
    ({ item }) => (
      <IngredientRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        tags={item.tags}
        usageCount={item.usageCount}
        singleCocktailName={item.singleCocktailName}
        inBar={item.inBar}
        inShoppingList={item.inShoppingList}
        baseIngredientId={item.baseIngredientId}
        onPress={onItemPress}
        onToggleInBar={toggleInBar}
        isNavigating={navigatingId === item.id}
      />
    ),
    [onItemPress, toggleInBar, navigatingId]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <HeaderWithSearch
        searchValue={search}
        setSearchValue={setSearch}
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
});
