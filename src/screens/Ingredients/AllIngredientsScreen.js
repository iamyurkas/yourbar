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
import {
  flushPendingIngredients,
  updateIngredientById,
} from "../../storage/ingredientsStorage";
import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import useIngredientsData from "../../hooks/useIngredientsData";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { sortByName } from "../../utils/sortByName";

export default function AllIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();
  const tabsOnTop = useTabsOnTop();
  const insets = useSafeAreaInsets();

  const { ingredients, loading, setIngredients } = useIngredientsData();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  // Use refs to buffer DB writes without triggering re-renders on each toggle
  const pendingUpdatesRef = React.useRef([]);
  const flushTimerRef = React.useRef(null);
  const filteredRef = React.useRef([]);

  useEffect(() => {
    if (isFocused) setTab("ingredients", "All");
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

  // data is loaded via useIngredientsData

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  const flushPending = useCallback(() => {
    const list = pendingUpdatesRef.current;
    if (list && list.length) {
      pendingUpdatesRef.current = [];
      flushPendingIngredients(list).catch(() => {});
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushPending();
    }, 300);
  }, [flushPending]);

  // No dependency-based effect needed: scheduling is handled via refs

  useEffect(() => {
    if (!isFocused) flushPending();
  }, [isFocused, flushPending]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushPending();
    };
  }, [flushPending]);

  const filtered = useMemo(() => {
    if (!isFocused) return filteredRef.current;
    const q = normalizeSearch(searchDebounced);
    let data = ingredients;
    if (q) data = data.filter((i) => i.searchName.includes(q));
    if (selectedTagIds.length > 0)
      data = data.filter(
        (i) =>
          Array.isArray(i.tags) &&
          i.tags.some((t) => selectedTagIds.includes(t.id))
      );
    const list = [...data].sort(sortByName);
    filteredRef.current = list;
    return list;
  }, [ingredients, searchDebounced, selectedTagIds, isFocused]);

  const toggleInBar = useCallback(
    (id) => {
      let updated;
      setIngredients((prev) => {
        const item = prev.get(id);
        if (!item) return prev;
        updated = { ...item, inBar: !item.inBar };
        return updateIngredientById(prev, updated);
      });
      if (updated) {
        pendingUpdatesRef.current.push(updated);
        scheduleFlush();
      }
    },
    [setIngredients, scheduleFlush]
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
