import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../data/settings";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { normalizeSearch } from "../../utils/normalizeSearch";
import {
  initIngredientsAvailability,
  updateIngredientAvailability,
} from "../../domain/ingredientsAvailabilityCache";
import { sortByName } from "../../utils/sortByName";
import { enqueueToggleInBar } from "../../services/IngredientCommandQueue";

export default function MyIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();
  const tabsOnTop = useTabsOnTop();
  const insets = useSafeAreaInsets();

  const { ingredients, loading, setIngredients, cocktails, usageMap } =
    useIngredientsData();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  const [availableMap, setAvailableMap] = useState(new Map());

  useEffect(() => {
    if (isFocused) setTab("ingredients", "My");
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ig, allow] = await Promise.all([
        getIgnoreGarnish(),
        getAllowSubstitutes(),
      ]);
      if (!cancelled) {
        setIgnoreGarnish(!!ig);
        setAllowSubstitutes(!!allow);
      }
    })();
    const subIg = addIgnoreGarnishListener(setIgnoreGarnish);
    const subAs = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => {
      cancelled = true;
      subIg.remove();
      subAs.remove();
    };
  }, []);

  // data loading handled by hook

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  useEffect(() => {
    const map = initIngredientsAvailability(
      ingredients,
      cocktails,
      usageMap,
      ignoreGarnish,
      allowSubstitutes
    );
    setAvailableMap(new Map(map));
  }, [cocktails, usageMap, ignoreGarnish, allowSubstitutes, ingredients.length]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(searchDebounced);
    let data = ingredients.filter((i) => i.inBar);
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter(
        (i) =>
          Array.isArray(i.tags) &&
          i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return [...data].sort(sortByName);
  }, [ingredients, searchDebounced, selectedTagIds]);

  const toggleInBar = useCallback(
    (id) => {
      let updatedList;
      setIngredients((prev) => {
        if (!(prev instanceof Map)) return prev;
        const next = new Map(prev);
        const item = next.get(id);
        if (!item) return prev;
        const updated = { ...item, inBar: !item.inBar };
        next.set(id, updated);
        updatedList = Array.from(next.values());
        return next;
      });
      if (updatedList) {
        const map = updateIngredientAvailability([id], updatedList);
        setAvailableMap(new Map(map));
        enqueueToggleInBar([id]).catch((error) =>
          console.warn("Failed to enqueue ingredient toggle", error)
        );
      }
    },
    [setIngredients]
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
    ({ item }) => {
      const info = availableMap.get(item.id) || { count: 0, single: null };
      return (
        <IngredientRow
          id={item.id}
          name={item.name}
          photoUri={item.photoUri}
          tags={item.tags}
          usageCount={info.count}
          singleCocktailName={info.single}
          showMake
          inBar={item.inBar}
          inShoppingList={item.inShoppingList}
          baseIngredientId={item.baseIngredientId}
          onPress={onItemPress}
          onToggleInBar={toggleInBar}
          isNavigating={navigatingId === item.id}
        />
      );
    },
    [onItemPress, toggleInBar, navigatingId, availableMap]
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
