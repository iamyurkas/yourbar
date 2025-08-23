import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "react-native-paper";

import HeaderWithSearch from "../components/HeaderWithSearch";
import TagFilterMenu from "../components/TagFilterMenu";
import CocktailRow, { COCKTAIL_ROW_HEIGHT } from "../components/CocktailRow";
import useIngredientsData from "../hooks/useIngredientsData";
import { getAllCocktailTags } from "../storage/cocktailTagsStorage";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
  getIgnoreGarnish,
  addIgnoreGarnishListener,
} from "../storage/settingsStorage";
import { normalizeSearch } from "../utils/normalizeSearch";

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
    const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );
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
      const required = (c.ingredients || []).filter(
        (r) => !r.optional && !(ignoreGarnish && r.garnish)
      );
      const missing = [];
      const ingredientNames = [];
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
        }
      }
      const allAvail = missing.length === 0;
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
        ingredientLine,
        isAllAvailable: availableSet.has(c.id),
        hasBranded: branded,
      };
    });
    return mapped.sort((a, b) => {
      if (a.isAllAvailable && !b.isAllAvailable) return -1;
      if (!a.isAllAvailable && b.isAllAvailable) return 1;
      return a.name.localeCompare(b.name);
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

