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
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getFavoritesMinRating,
  addFavoritesMinRatingListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../data/settings";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TagFilterMenu from "../../components/TagFilterMenu";
import { getAllCocktailTags } from "../../data/cocktailTags";
import CocktailRow, {
  COCKTAIL_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/CocktailRow";
import TabSwipe from "../../components/TabSwipe";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { sortByName } from "../../utils/sortByName";
import {
  buildIngredientIndex,
  getCocktailIngredientInfo,
} from "../../domain/cocktailIngredients";

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

  useEffect(() => {
    if (isFocused) setTab("cocktails", "Favorites");
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
    const { ingMap, findBrand } = buildIngredientIndex(ingredients || []);
    const q = normalizeSearch(searchDebounced);
    let list = cocktails.filter((c) => c.rating > 0 && c.rating >= minRating);
    if (q) list = list.filter((c) => normalizeSearch(c.name).includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return list
      .map((c) => {
        const { ingredientLine, isAllAvailable, hasBranded } =
          getCocktailIngredientInfo(c, {
            ingMap,
            findBrand,
            allowSubstitutes,
            ignoreGarnish,
          });
        return {
          ...c,
          isAllAvailable,
          hasBranded,
          ingredientLine,
        };
      })
      .sort(sortByName);
  }, [
    cocktails,
    ingredients,
    searchDebounced,
    selectedTagIds,
    ignoreGarnish,
    minRating,
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
        getItemType={() => "COCKTAIL"}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <View style={{ padding: 24 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No cocktails found
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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
});

