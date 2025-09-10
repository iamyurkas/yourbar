import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import TopTabBar from "../../components/TopTabBar";
import { useTabMemory } from "../../context/TabMemoryContext";
import useTabsOnTop from "../../hooks/useTabsOnTop";
import { setIngredientsInShoppingList } from "../../domain/ingredients";
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
import CocktailRow, {
  COCKTAIL_ROW_HEIGHT,
  IMAGE_SIZE,
} from "../../components/CocktailRow";
import IngredientRow, { INGREDIENT_ROW_HEIGHT } from "../../components/IngredientRow";
import ListSkeleton from "../../components/ListSkeleton";
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
  const {
    cocktails: globalCocktails = [],
    ingredients: globalIngredients = [],
    loading: globalLoading,
    setIngredients: setGlobalIngredients,
  } = useIngredientUsage();

  const shoppingListChangesRef = useRef(shoppingListChanges);
  useEffect(() => {
    shoppingListChangesRef.current = shoppingListChanges;
  }, [shoppingListChanges]);

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

  useEffect(() => {
    setCocktails(globalCocktails);
  }, [globalCocktails]);

  useEffect(() => {
    setIngredients(new Map(globalIngredients.map((i) => [i.id, i])));
  }, [globalIngredients]);

  useEffect(() => {
    setLoading(globalLoading);
  }, [globalLoading]);

  useEffect(() => {
    if (!isFocused) return;
    let cancel = false;
    (async () => {
      const [ig, allowSubs] = await Promise.all([
        getIgnoreGarnish(),
        getAllowSubstitutes(),
      ]);
      if (cancel) return;
      setIgnoreGarnish(!!ig);
      setAllowSubstitutes(!!allowSubs);
    })();
    const subIg = addIgnoreGarnishListener(setIgnoreGarnish);
    const subAs = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => {
      cancel = true;
      subIg.remove();
      subAs.remove();
    };
  }, [isFocused]);

  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      const changes = shoppingListChangesRef.current;
      if (!changes.size) return;
      const toAdd = [];
      const toRemove = [];
      changes.forEach((value, id) => {
        (value ? toAdd : toRemove).push(id);
      });
      shoppingListChangesRef.current = new Map();
      setShoppingListChanges(new Map());
      (async () => {
        if (toAdd.length) await setIngredientsInShoppingList(toAdd, true);
        if (toRemove.length) await setIngredientsInShoppingList(toRemove, false);
      })();
      if (toAdd.length || toRemove.length) {
        setIngredients((prev) => {
          const next = new Map(prev);
          toAdd.forEach((id) => {
            const ing = next.get(id);
            if (ing) next.set(id, { ...ing, inShoppingList: true });
          });
          toRemove.forEach((id) => {
            const ing = next.get(id);
            if (ing) next.set(id, { ...ing, inShoppingList: false });
          });
          return next;
        });
        setGlobalIngredients?.((prev) => {
          const next = new Map(prev);
          toAdd.forEach((id) => {
            const ing = next.get(id);
            if (ing) next.set(id, { ...ing, inShoppingList: true });
          });
          toRemove.forEach((id) => {
            const ing = next.get(id);
            if (ing) next.set(id, { ...ing, inShoppingList: false });
          });
          return next;
        });
      }
    });
    return unsub;
  }, [navigation, setIngredients, setGlobalIngredients]);

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
          loading ? (

            <ListSkeleton height={ITEM_HEIGHT} imageSize={IMAGE_SIZE} />

          ) : (
            <View style={{ padding: 24 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No cocktails available
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

