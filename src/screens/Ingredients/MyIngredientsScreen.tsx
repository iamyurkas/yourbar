import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TopTabBar from "../../components/TopTabBar";
import TagFilterMenu from "../../components/TagFilterMenu";
import IngredientRow, {
  INGREDIENT_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/IngredientRow";
import TabSwipe from "../../components/TabSwipe";
import { useTabMemory } from "../../context/TabMemoryContext";
import { toggleIngredientsInBar } from "../../domain/ingredients";
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
import { initIngredientsAvailability } from "../../domain/ingredientsAvailabilityCache";
import { sortByName } from "../../utils/sortByName";

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
  // Collect toggled ingredient IDs and flush on screen exit
  const pendingIdsRef = React.useRef(new Set());
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

  const flushPending = useCallback(async () => {
    const ids = Array.from(pendingIdsRef.current);
    if (ids.length) {
      pendingIdsRef.current = new Set();
      try {
        await toggleIngredientsInBar(ids);
      } catch {}
      let updatedList;
      setIngredients((prev) => {
        const next = new Map(prev);
        ids.forEach((id) => {
          const item = next.get(id);
          if (item) next.set(id, { ...item, inBar: !item.inBar });
        });
        updatedList = Array.from(next.values());
        return next;
      });
      const map = initIngredientsAvailability(
        updatedList,
        cocktails,
        usageMap,
        ignoreGarnish,
        allowSubstitutes
      );
      setAvailableMap(new Map(map));
    }
  }, [
    setIngredients,
    cocktails,
    usageMap,
    ignoreGarnish,
    allowSubstitutes,
  ]);

  useEffect(() => {
    if (!isFocused) {
      flushPending().catch(() => {});
    }
  }, [isFocused, flushPending]);

  useEffect(() => {
    return () => {
      flushPending().catch(() => {});
    };
  }, [flushPending]);

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

  const toggleInBar = useCallback((id) => {
    const set = pendingIdsRef.current;
    if (set.has(id)) set.delete(id);
    else set.add(id);
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
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No ingredients found
            </Text>
          </View>
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
});
