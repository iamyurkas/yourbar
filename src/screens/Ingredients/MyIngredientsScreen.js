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
import { useTabMemory } from "../../context/TabMemoryContext";
import { queueIngredientSave, updateIngredientById } from "../../storage/ingredientsStorage";
import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import useIngredientsData from "../../hooks/useIngredientsData";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../storage/settingsStorage";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { normalizeSearch } from "../../utils/normalizeSearch";

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
  const [pendingUpdates, setPendingUpdates] = useState([]);

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

  const flushPending = useCallback(() => {
    if (pendingUpdates.length) {
      pendingUpdates.forEach((i) => queueIngredientSave(i.id, i));
      setPendingUpdates([]);
    }
  }, [pendingUpdates]);

  useEffect(() => {
    if (!pendingUpdates.length) return;
    const handle = setTimeout(() => {
      flushPending();
    }, 300);
    return () => clearTimeout(handle);
  }, [pendingUpdates, flushPending]);

  useEffect(() => {
    if (!isFocused) {
      flushPending();
    }
  }, [isFocused, flushPending]);

  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  const availableMap = useMemo(() => {
    const ingMap = new Map(ingredients.map((i) => [String(i.id), i]));
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );
    const cocktailMap = new Map(cocktails.map((c) => [c.id, c]));
    const result = new Map();

    const isAvailable = (cocktail) => {
      const required = (cocktail.ingredients || []).filter(
        (r) => !r.optional && !(ignoreGarnish && r.garnish)
      );
      if (required.length === 0) return false;
      for (const r of required) {
        const ing = ingMap.get(String(r.ingredientId));
        const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
        let used = null;
        if (ing?.inBar) used = ing;
        else {
          if (allowSubstitutes || r.allowBaseSubstitution) {
            const base = ingMap.get(baseId);
            if (base?.inBar) used = base;
          }
          if (
            !used &&
            (allowSubstitutes || r.allowBrandedSubstitutes || ing?.baseIngredientId != null)
          ) {
            const brand = findBrand(baseId);
            if (brand) used = brand;
          }
          if (!used && Array.isArray(r.substitutes)) {
            for (const s of r.substitutes) {
              const cand = ingMap.get(String(s.id));
              if (cand?.inBar) {
                used = cand;
                break;
              }
            }
          }
        }
        if (!used) return false;
      }
      return true;
    };

    ingredients.forEach((ing) => {
      const ids = usageMap[ing.id] || [];
      let count = 0;
      let singleName = null;
      ids.forEach((cid) => {
        const cocktail = cocktailMap.get(cid);
        if (cocktail && isAvailable(cocktail)) {
          count++;
          singleName = cocktail.name;
        }
      });
      result.set(ing.id, { count, single: count === 1 ? singleName : null });
    });

    return result;
  }, [ingredients, cocktails, usageMap, ignoreGarnish, allowSubstitutes]);

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
    return data;
  }, [ingredients, searchDebounced, selectedTagIds]);

  const toggleInBar = useCallback(
    (id) => {
      let updated;
      setIngredients((prev) => {
        const item = prev.find((i) => i.id === id);
        if (!item) return prev;
        updated = { ...item, inBar: !item.inBar };
        return updateIngredientById(prev, updated);
      });
      if (updated) setPendingUpdates((p) => [...p, updated]);
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
});
