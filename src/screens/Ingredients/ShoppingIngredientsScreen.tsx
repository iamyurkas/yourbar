import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TopTabBar from "../../components/TopTabBar";
import TagFilterMenu from "../../components/TagFilterMenu";
import IngredientRow, {
  INGREDIENT_ROW_HEIGHT as ITEM_HEIGHT,
  IMAGE_SIZE,
} from "../../components/IngredientRow";
import ListSkeleton from "../../components/ListSkeleton";
import TabSwipe from "../../components/TabSwipe";
import { useTabMemory } from "../../context/TabMemoryContext";
import { getAllTags } from "../../data/ingredientTags";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import useIngredientsData from "../../hooks/useIngredientsData";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { sortByName } from "../../utils/sortByName";
import { useIngredientFlags, toggleInShopping } from "../../state/ingredients.store";

export default function ShoppingIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();
  const tabsOnTop = useTabsOnTop();
  const insets = useSafeAreaInsets();

  const { ingredients, loading } = useIngredientsData();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const inShoppingMap = useIngredientFlags((state) => state.inShoppingMap);

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
    const q = normalizeSearch(searchDebounced);
    let data = ingredients.filter((i) => inShoppingMap[String(i.id)]);
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter(
        (i) =>
          Array.isArray(i.tags) &&
          i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return [...data].sort(sortByName);
  }, [ingredients, inShoppingMap, searchDebounced, selectedTagIds]);

  const handleToggleShopping = useCallback(
    (id) => {
      toggleInShopping(String(id));
    },
    []
  );

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
        baseIngredientId={item.baseIngredientId}
        onPress={onItemPress}
        onToggleShoppingList={handleToggleShopping}
        isNavigating={navigatingId === item.id}
      />
    ),
    [onItemPress, handleToggleShopping, navigatingId]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <TabSwipe navigation={navigation}>
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
      {tabsOnTop && <TopTabBar navigation={navigation} theme={theme} />}
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
          loading ? (

            <ListSkeleton height={ITEM_HEIGHT} imageSize={IMAGE_SIZE} />

          ) : (
            <View style={{ padding: 24 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No ingredients found
              </Text>
            </View>
          )
        }
        contentContainerStyle={{
          paddingBottom: 56 + (tabsOnTop ? 0 : 56) + insets.bottom,
        }}
      />
      </View>
    </TabSwipe>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
