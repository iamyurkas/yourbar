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
import { useTabMemory } from "../../context/TabMemoryContext";
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { getAllIngredients, saveIngredient } from "../../storage/ingredientsStorage";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
} from "../../storage/settingsStorage";
import { useTheme } from "react-native-paper";
import TagFilterMenu from "../../components/TagFilterMenu";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import CocktailRow, { COCKTAIL_ROW_HEIGHT } from "../../components/CocktailRow";
import IngredientRow, { INGREDIENT_ROW_HEIGHT } from "../../components/IngredientRow";

const ITEM_HEIGHT = Math.max(COCKTAIL_ROW_HEIGHT, INGREDIENT_ROW_HEIGHT);

export default function MyCocktailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [cocktails, setCocktails] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);

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
      const [cocktailsList, ingredientsList, ig] = await Promise.all([
        getAllCocktails(),
        getAllIngredients(),
        getIgnoreGarnish(),
      ]);
      if (cancel) return;
      setCocktails(Array.isArray(cocktailsList) ? cocktailsList : []);
      setIngredients(Array.isArray(ingredientsList) ? ingredientsList : []);
      setIgnoreGarnish(!!ig);
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    })();
    const sub = addIgnoreGarnishListener(setIgnoreGarnish);
    return () => {
      cancel = true;
      sub.remove();
    };
  }, [isFocused]);

  const processed = useMemo(() => {
    const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );
    const q = searchDebounced.trim().toLowerCase();
    let list = cocktails;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return list.map((c) => {
      const required = (c.ingredients || []).filter(
        (r) => !r.optional && !(ignoreGarnish && r.garnish)
      );
      const missingNames = [];
      const missingIds = [];
      const ingredientNames = [];
      let allAvail = required.length > 0;
      for (const r of required) {
        const ing = ingMap.get(String(r.ingredientId));
        const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
        let used = null;
        if (ing?.inBar) {
          used = ing;
        } else {
          if (r.allowBaseSubstitution) {
            const base = ingMap.get(baseId);
            if (base?.inBar) used = base;
          }
          const isBaseIngredient = ing?.baseIngredientId == null;
          if (!used && (r.allowBrandedSubstitutes || isBaseIngredient)) {
            const brand = findBrand(baseId);
            if (brand) used = brand;
          }
          if (!used && Array.isArray(r.substitutes)) {
            for (const s of r.substitutes) {
              const candidate = ingMap.get(String(s.id));
              if (candidate?.inBar) {
                used = candidate;
                break;
              }
            }
          }
        }
        if (used) {
          ingredientNames.push(used.name);
        } else {
          const missingName = ing?.name || r.name || "";
          if (missingName) missingNames.push(missingName);
          missingIds.push(baseId);
          allAvail = false;
        }
      }
      const branded = (c.ingredients || []).some((r) => {
        const ing = ingMap.get(String(r.ingredientId));
        return ing && ing.baseIngredientId != null;
      });
      let ingredientLine = ingredientNames.join(", ");
      if (!allAvail) {
        if (missingNames.length > 0 && missingNames.length <= 2) {
          ingredientLine = `Missing: ${missingNames.join(", ")}`;
        } else if (missingNames.length >= 3 || missingNames.length === 0) {
          ingredientLine = `Missing: ${missingNames.length || required.length} ingredients`;
        }
      }
      return {
        ...c,
        isAllAvailable: allAvail,
        hasBranded: branded,
        ingredientLine,
        missingIngredientIds: missingIds,
      };
    });
  }, [cocktails, ingredients, searchDebounced, selectedTagIds, ignoreGarnish]);

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
        ingredient: ingredients.find((i) => String(i.id) === String(id)),
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
      navigation.navigate("Create", {
        screen: "CocktailDetails",
        params: { id },
      });
      setTimeout(() => setNavigatingId(null), 500);
    },
    [navigation]
  );

  const handleIngredientPress = useCallback(
    (id) => {
      navigation.navigate("Ingredients", {
        screen: "Create",
        params: { screen: "IngredientDetails", params: { id } },
      });
    },
    [navigation]
  );

  const toggleShoppingList = useCallback((id) => {
    setIngredients((prev) => {
      const idx = prev.findIndex((i) => String(i.id) === String(id));
      if (idx === -1) return prev;
      const next = [...prev];
      const item = next[idx];
      const updated = { ...item, inShoppingList: !item.inShoppingList };
      next[idx] = updated;
      saveIngredient(updated).catch(() => {});
      return next;
    });
  }, []);

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
            inShoppingList={ing.inShoppingList}
            baseIngredientId={ing.baseIngredientId}
            onPress={handleIngredientPress}
            onToggleShoppingList={toggleShoppingList}
            highlightColor={theme.colors.secondaryContainer}
          />
        );
      }
      return (
        <View style={{ padding: 24 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            For the cocktails below – get more ingredients.
          </Text>
        </View>
      );
    },
    [
      handlePress,
      navigatingId,
      handleIngredientPress,
      toggleShoppingList,
      theme.colors.onSurfaceVariant,
      theme.colors.secondaryContainer,
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
});

