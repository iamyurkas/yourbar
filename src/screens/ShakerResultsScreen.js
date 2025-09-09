import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "react-native-paper";

import HeaderWithSearch from "../components/HeaderWithSearch";
import TagFilterMenu from "../components/TagFilterMenu";
import CocktailRow, { COCKTAIL_ROW_HEIGHT } from "../components/CocktailRow";
import useIngredientsData from "../hooks/useIngredientsData";
import { getAllCocktailTags } from "../data/cocktailTags";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
  getIgnoreGarnish,
  addIgnoreGarnishListener,
} from "../data/settings";
import { normalizeSearch } from "../utils/normalizeSearch";
import { sortByName } from "../utils/sortByName";
import {
  buildIngredientIndex,
  getCocktailIngredientInfo,
} from "../domain/cocktailIngredients";

export default function ShakerResultsScreen({ route, navigation }) {
  const { availableIds = [], recipeIds = [] } = route.params || {};
  const theme = useTheme();
  const { cocktails, ingredients, loading } = useIngredientsData();
  const [search, setSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tags = await getAllCocktailTags();
      if (!cancelled) setAvailableTags(tags || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [allow, ig] = await Promise.all([
        getAllowSubstitutes(),
        getIgnoreGarnish(),
      ]);
      if (!cancelled) {
        setAllowSubstitutes(!!allow);
        setIgnoreGarnish(!!ig);
      }
    })();
    const subAllow = addAllowSubstitutesListener(setAllowSubstitutes);
    const subIg = addIgnoreGarnishListener(setIgnoreGarnish);
    return () => {
      cancelled = true;
      subAllow.remove();
      subIg.remove();
    };
  }, []);

  const data = useMemo(() => {
    const { ingMap, findBrand } = buildIngredientIndex(ingredients || []);
    const availableSet = new Set(availableIds);
    const q = normalizeSearch(search);
    let list = cocktails.filter((c) => recipeIds.includes(c.id));
    if (q) list = list.filter((c) => normalizeSearch(c.name).includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    const mapped = list.map((c) => {
      const { ingredientLine, hasBranded, isAllAvailable } =
        getCocktailIngredientInfo(c, {
          ingMap,
          findBrand,
          allowSubstitutes,
          ignoreGarnish,
        });
      return {
        ...c,
        ingredientLine,
        hasBranded,
        isAllAvailable: availableSet.has(c.id) && isAllAvailable,
      };
    });
    return mapped.sort((a, b) => {
      if (a.isAllAvailable && !b.isAllAvailable) return -1;
      if (!a.isAllAvailable && b.isAllAvailable) return 1;
      return sortByName(a, b);
    });
  }, [
    cocktails,
    ingredients,
    recipeIds,
    availableIds,
    search,
    selectedTagIds,
    allowSubstitutes,
    ignoreGarnish,
  ]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
      <FlashList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
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
            onPress={(id) => navigation.navigate("CocktailDetails", { id })}
          />
        )}
        estimatedItemSize={COCKTAIL_ROW_HEIGHT}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

