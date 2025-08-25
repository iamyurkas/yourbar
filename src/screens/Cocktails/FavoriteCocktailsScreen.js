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
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { getAllIngredients } from "../../storage/ingredientsStorage";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getFavoritesMinRating,
  addFavoritesMinRatingListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../storage/settingsStorage";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagFilterMenu from "../../components/TagFilterMenu";
import SortMenu from "../../components/SortMenu";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import CocktailRow, {
  COCKTAIL_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/CocktailRow";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { sortByName } from "../../utils/sortByName";

export default function FavoriteCocktailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();
  const tabsOnTop = useTabsOnTop();
  const insets = useSafeAreaInsets();
  const { cocktails: globalCocktails = [], ingredients: globalIngredients = [] } =
    useIngredientUsage();

  const [cocktails, setCocktails] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    if (isFocused) setTab("cocktails", "Favorite");
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
      const [cocktailsList, ingredientsList, ig, favMin, allowSubs] =
        await Promise.all([
          cocktailPromise,
          ingredientPromise,
          getIgnoreGarnish(),
          getFavoritesMinRating(),
          getAllowSubstitutes(),
        ]);
      if (cancel) return;
      setCocktails(Array.isArray(cocktailsList) ? cocktailsList : []);
      setIngredients(Array.isArray(ingredientsList) ? ingredientsList : []);
      setIgnoreGarnish(!!ig);
      setMinRating(favMin || 0);
      setAllowSubstitutes(!!allowSubs);
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    })();
    const subIg = addIgnoreGarnishListener(setIgnoreGarnish);
    const subFav = addFavoritesMinRatingListener(setMinRating);
    const subAs = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => {
      cancel = true;
      subIg.remove();
      subFav.remove();
      subAs.remove();
    };
  }, [isFocused, globalCocktails, globalIngredients]);

  const filtered = useMemo(() => {
    const ingMap = new Map(
      (ingredients || []).map((i) => [String(i.id), i])
    );
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );
    const q = normalizeSearch(searchDebounced);
    let list = cocktails.filter((c) => c.rating > 0 && c.rating >= minRating);
    if (q) list = list.filter((c) => normalizeSearch(c.name).includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    const mapped = list.map((c) => {
      const required = (c.ingredients || []).filter(
        (r) => !r.optional && !(ignoreGarnish && r.garnish)
      );
      const missing = [];
      const ingredientNames = [];
      let allAvail = required.length > 0;
      let branded = false;
      for (const r of required) {
        const ing = ingMap.get(String(r.ingredientId));
        const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
        let used = null;
        if (ing?.inBar) {
          used = ing;
        } else {
          if (allowSubstitutes || r.allowBaseSubstitution) {
            const base = ingMap.get(baseId);
            if (base?.inBar) used = base;
          }
          const isBaseIngredient = ing?.baseIngredientId == null;
          if (
            !used &&
            (allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient)
          ) {
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
          if (used.baseIngredientId != null) branded = true;
        } else {
          if (ing?.baseIngredientId != null) branded = true;
          const missingName = ing?.name || r.name || "";
          if (missingName) missing.push(missingName);
          allAvail = false;
        }
      }
      let ingredientLine = ingredientNames.join(", ");
      if (!allAvail) {
        if (missing.length > 0 && missing.length <= 2) {
          ingredientLine = `Missing: ${missing.join(", ")}`;
        } else if (missing.length >= 3 || missing.length === 0) {
          ingredientLine = `Missing: ${missing.length || required.length} ingredients`;
        }
      }
      return {
        ...c,
        isAllAvailable: allAvail,
        hasBranded: branded,
        ingredientLine,
      };
    });
    mapped.sort((a, b) => {
      const aRating = a.rating ?? 0;
      const bRating = b.rating ?? 0;
      if (aRating === bRating) return sortByName(a, b);
      return sortOrder === "asc" ? aRating - bRating : bRating - aRating;
    });
    return mapped;
  }, [
    cocktails,
    ingredients,
    searchDebounced,
    selectedTagIds,
    ignoreGarnish,
    minRating,
    sortOrder,
    allowSubstitutes,
  ]);

  const handlePress = useCallback(
    (id) => {
      setNavigatingId(id);
      navigation.navigate("CocktailDetails", { id });
      setTimeout(() => setNavigatingId(null), 500);
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <CocktailRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        glassId={item.glassId}
        tags={item.tags}
        ingredientLine={item.ingredientLine}
        rating={item.rating}
        isAllAvailable={item.isAllAvailable}
        hasBranded={item.hasBranded}
        onPress={handlePress}
        isNavigating={navigatingId === item.id}
      />
    ),
    [handlePress, navigatingId]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

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
          <View style={{ flexDirection: "row" }}>
            {minRating < 5 && (
              <SortMenu order={sortOrder} onChange={setSortOrder} />
            )}
            <TagFilterMenu
              tags={availableTags}
              selected={selectedTagIds}
              setSelected={setSelectedTagIds}
            />
          </View>
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
        getItemType={() => "COCKTAIL"}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No cocktails found
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

