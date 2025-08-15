import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TopTabBar from "../../components/TopTabBar";
import TagFilterMenu from "../../components/TagFilterMenu";
import IngredientRow, {
  INGREDIENT_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/IngredientRow";
import { useTabMemory } from "../../context/TabMemoryContext";
import { saveIngredient } from "../../storage/ingredientsStorage";
import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import useIngredientsData from "../../hooks/useIngredientsData";

export default function ShoppingIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const { ingredients, loading, setIngredients } = useIngredientsData();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    if (isFocused) setTab("ingredients", "Shopping");
  }, [isFocused, setTab]);

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

  // data loading handled by hook

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  const filtered = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    let data = ingredients.filter((i) => i.inShoppingList);
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter(
        (i) =>
          Array.isArray(i.tags) &&
          i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return data;
  }, [ingredients, searchDebounced, selectedTagIds]);

  const removeFromList = useCallback((id) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const item = next[idx];
      const updated = { ...item, inShoppingList: false };
      next[idx] = updated;
      saveIngredient(updated).catch(() => {});
      return next;
    });
  }, []);

  const onItemPress = useCallback(
    (id) => {
      setNavigatingId(id);
      navigation.navigate("IngredientDetails", { id });
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
        onRemove={removeFromList}
        isNavigating={navigatingId === item.id}
      />
    ),
    [onItemPress, removeFromList, navigatingId]
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
      <TopTabBar navigation={navigation} theme={theme} />
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
