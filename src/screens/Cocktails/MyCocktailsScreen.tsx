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
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TopTabBar from "../../components/TopTabBar";
import { useTabMemory } from "../../context/TabMemoryContext";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { getAllCocktails } from "../../domain/cocktails";
import { getAllIngredients } from "../../domain/ingredients";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../data/settings";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagFilterMenu from "../../components/TagFilterMenu";
import { getAllCocktailTags } from "../../data/cocktailTags";
import CocktailRow, { COCKTAIL_ROW_HEIGHT } from "../../components/CocktailRow";
import IngredientRow, { INGREDIENT_ROW_HEIGHT } from "../../components/IngredientRow";
import TabSwipe from "../../components/TabSwipe";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import { normalizeSearch } from "../../utils/normalizeSearch";
import {
  buildIngredientIndex,
  getCocktailIngredientInfo,
} from "../../domain/cocktailIngredients";
import { sortByName } from "../../utils/sortByName";

const ITEM_HEIGHT = Math.max(COCKTAIL_ROW_HEIGHT, INGREDIENT_ROW_HEIGHT);

export default function MyCocktailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();
  const tabsOnTop = useTabsOnTop();
  const insets = useSafeAreaInsets();

  const [cocktails, setCocktails] = useState([]);
  const [ingredients, setIngredients] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  // Local memory of shopping-list changes
  const [shoppingListChanges, setShoppingListChanges] = useState(new Map());
  const { cocktails: globalCocktails = [], ingredients: globalIngredients = [] } =
    useIngredientUsage();

  useEffect(() => {
    if (isFocused) setTab("cocktails", "My");
  }, [isFocused, setTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getAllCocktailTags();
      if (!cancelled) setAvailableTags(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  const firstLoad = useRef(true);
  useEffect(() => {
    let cancel = false;
    if (!isFocused) return;
    (async () => {
      if (firstLoad.current) setLoading(true);
      const cocktailPromise =
        globalCocktails.length ? Promise.resolve(globalCocktails) : getAllCocktails();
      const ingredientPromise =
        globalIngredients.length ? Promise.resolve(globalIngredients) : getAllIngredients();
      const [cocktailsList, ingredientsList, ig, allowSubs] = await Promise.all([
        cocktailPromise,
        ingredientPromise,
        getIgnoreGarnish(),
        getAllowSubstitutes(),
      ]);
      if (cancel) return;
      setCocktails(Array.isArray(cocktailsList) ? cocktailsList : []);
      setIngredients(
        new Map(
          (Array.isArray(ingredientsList) ? ingredientsList : []).map((i) => [i.id, i])
        )
      );
      setIgnoreGarnish(!!ig);
      setAllowSubstitutes(!!allowSubs);
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    })();
    const subIg = addIgnoreGarnishListener(setIgnoreGarnish);
    const subAs = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => {
      cancel = true;
      subIg.remove();
      subAs.remove();
    };
  }, [isFocused, globalCocktails, globalIngredients]);

  const processed = useMemo(() => {
    const ingredientArr = Array.from(ingredients.values());
    const { ingMap, findBrand } = buildIngredientIndex(ingredientArr);
    const q = normalizeSearch(searchDebounced);
    let list = cocktails;
    if (q) list = list.filter((c) => normalizeSearch(c.name).includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return list
      .map((c) => {
        const {
          ingredientLine,
          isAllAvailable,
          hasBranded,
          missingIngredientIds,
        } = getCocktailIngredientInfo(c, {
          ingMap,
          findBrand,
          allowSubstitutes,
          ignoreGarnish,
        });
        return {
          ...c,
          ingredientLine,
          isAllAvailable,
          hasBranded,
          missingIngredientIds,
        };
      })
      .sort(sortByName);
  }, [
    cocktails,
    ingredients,
    searchDebounced,
    selectedTagIds,
    ignoreGarnish,
    allowSubstitutes,
  ]);

  const { available, suggestions } = useMemo(() => {
    const avail = processed.filter((c) => c.isAllAvailable);
    const map = new Map();
    for (const c of processed) {
      if (c.isAllAvailable) continue;
      if (c.missingIngredientIds?.length === 1) {
        const id = c.missingIngredientIds[0];
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(c);
      }
    }
    const sugg = Array.from(map.entries())
      .map(([id, cocks]) => ({
        ingredient: ingredients.get(Number(id)) || ingredients.get(id),
        cocktails: cocks,
      }))
      .filter((s) => s.ingredient && !s.ingredient.inBar)
      .sort((a, b) => b.cocktails.length - a.cocktails.length);
    return { available: avail, suggestions: sugg };
  }, [processed, ingredients]);

  const listData = useMemo(() => {
    const data = available.map((c) => ({ type: "cocktail", item: c }));
    if (suggestions.length > 0) {
      data.push({ type: "info" });
      suggestions.forEach((s) => {
        data.push({ type: "ingredient", ingredient: s.ingredient, cocktails: s.cocktails });
        s.cocktails.forEach((c) => data.push({ type: "cocktail", item: c }));
      });
    }
    return data;
  }, [available, suggestions]);

  const handlePress = useCallback(
    (id) => {
      setNavigatingId(id);
      navigation.navigate("CocktailDetails", { id });
      setTimeout(() => setNavigatingId(null), 500);
    },
    [navigation]
  );

  const handleIngredientPress = useCallback(
    (id) => {
      navigation.navigate("IngredientDetails", { id });
    },
    [navigation]
  );

  const toggleShoppingList = useCallback(
    (id) => {
      requestAnimationFrame(() => {
        setShoppingListChanges((prev) => {
          const next = new Map(prev);
          const original = ingredients.get(id)?.inShoppingList || false;
          const current = next.has(id) ? next.get(id) : original;
          const updated = !current;
          if (updated === original) next.delete(id);
          else next.set(id, updated);
          return next;
        });
      });
    },
    [ingredients]
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === "cocktail") {
        const c = item.item;
        return (
          <CocktailRow
            id={c.id}
            name={c.name}
            photoUri={c.photoUri}
            glassId={c.glassId}
            tags={c.tags}
            ingredientLine={c.ingredientLine}
            rating={c.rating}
            isAllAvailable={c.isAllAvailable}
            hasBranded={c.hasBranded}
            onPress={handlePress}
            isNavigating={navigatingId === c.id}
          />
        );
      }
      if (item.type === "ingredient") {
        const ing = item.ingredient;
        const inShopping = shoppingListChanges.has(ing.id)
          ? shoppingListChanges.get(ing.id)
          : ing.inShoppingList;
        return (
          <IngredientRow
            id={ing.id}
            name={ing.name}
            photoUri={ing.photoUri}
            tags={ing.tags}
            usageCount={item.cocktails.length}
            singleCocktailName={item.cocktails[0]?.name}
            showMake
            inBar={ing.inBar}
            inShoppingList={inShopping}
            baseIngredientId={ing.baseIngredientId}
            onPress={handleIngredientPress}
            onToggleShoppingList={toggleShoppingList}
            highlightColor={theme.colors.inversePrimary}
          />
        );
      }
      return (
        <View style={{ padding: 24 }}>
          <Text style={{ textAlign:"center", color: theme.colors.onSurfaceVariant }}>
            More ingredients needed
          </Text>
        </View>
      );
    },
    [
      handlePress,
      navigatingId,
      handleIngredientPress,
      toggleShoppingList,
      shoppingListChanges,
      theme.colors.onSurfaceVariant,
      theme.colors.inversePrimary,
    ]
  );

  const keyExtractor = useCallback((item, index) => {
    if (item.type === "cocktail") return `c${item.item.id}`;
    if (item.type === "ingredient") return `i${item.ingredient.id}`;
    return `t${index}`;
  }, []);

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

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
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={ITEM_HEIGHT}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={12}
        getItemType={(item) =>
          item.type === "cocktail"
            ? "COCKTAIL"
            : item.type === "ingredient"
            ? "ING"
            : "TEXT"
        }
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No cocktails available
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

