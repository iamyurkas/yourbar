import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

import HeaderWithSearch from "../components/HeaderWithSearch";
import IngredientRow, { INGREDIENT_ROW_HEIGHT } from "../components/IngredientRow";
import useIngredientsData from "../hooks/useIngredientsData";
import useAvailableByIngredient from "../hooks/useAvailableByIngredient";
import useAvailabilityIngredientsSnapshot from "../hooks/useAvailabilityIngredientsSnapshot";
import { makeIngredientAvailabilityKey } from "../utils/ingredientKeys";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
  getIgnoreGarnish,
  addIgnoreGarnishListener,
} from "../data/settings";
import {
  buildShakerListData,
  computeRecipeMatches,
  computeAvailableCocktails,
} from "../domain/shakerService";
import type { ShakerListItem } from "../types/models";

type ShakerScreenProps = { navigation: any; };


export default function ShakerScreen({ navigation }: ShakerScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    ingredients,
    cocktails,
    usageMap,
    loading,
    ingredientTags,
    ingredientsByTag,
  } = useIngredientsData();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState<string>("");
  const [inStockOnly, setInStockOnly] = useState<boolean>(true);
  const [allowSubstitutes, setAllowSubstitutes] = useState<boolean>(false);
  const [ignoreGarnish, setIgnoreGarnish] = useState<boolean>(false);

  const listData = useMemo<ShakerListItem[]>(
    () =>
      buildShakerListData({
        ingredientTags,
        ingredientsByTag,
        search,
        inStockOnly,
        expanded,
      }),
    [ingredientTags, ingredientsByTag, search, inStockOnly, expanded]
  );

  const toggleTag = (id: number): void => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleIngredient = (id: number): void => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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

  const ingredientsKey = useMemo(
    () => makeIngredientAvailabilityKey(ingredients),
    [ingredients]
  );

  const ingredientsForAvailability = useAvailabilityIngredientsSnapshot(
    ingredients || [],
    ingredientsKey
  );

  const availableByIngredient = useAvailableByIngredient(
    ingredientsForAvailability,
    cocktails,
    usageMap,
    allowSubstitutes,
    ignoreGarnish,
    ingredientsKey
  );

  const renderItem = useCallback(
    ({ item }: { item: ShakerListItem }) => {
      if (item.type === "TAG") {
        const { tag } = item;
        const isOpen = expanded[tag.id];
        return (
          <View style={{ marginBottom: isOpen ? 0 : 12 }}>
            <TouchableOpacity
              onPress={() => toggleTag(tag.id)}
              style={[styles.tagHeader, { backgroundColor: tag.color }]}
            >
              <Text style={styles.tagTitle}>{tag.name}</Text>
              <MaterialIcons
                name={isOpen ? "expand-less" : "expand-more"}
                size={24}
                color={theme.colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        );
      }
      const { ingredient: ing, isLast } = item;
      const active = selectedIds.includes(ing.id);
      const info = availableByIngredient.get(ing.id) || { count: 0, name: null };
      return (
        <View style={isLast ? { marginBottom: 12 } : null}>
          <IngredientRow
            id={ing.id}
            name={ing.name}
            photoUri={ing.photoUri}
            usageCount={info.count}
            singleCocktailName={info.name}
            showMake
            inBar={ing.inBar}
            inShoppingList={ing.inShoppingList}
            baseIngredientId={ing.baseIngredientId}
            onPress={toggleIngredient}
            onDetails={(id) => navigation.push("IngredientDetails", { id })}
            highlightColor={active ? theme.colors.inversePrimary : undefined}
          />
        </View>
      );
    },
    [
      expanded,
      toggleTag,
      theme,
      selectedIds,
      toggleIngredient,
      navigation,
      availableByIngredient,
    ]
  );

  const keyExtractor = useCallback((item: ShakerListItem) => {
    if (item.type === "TAG") return `tag-${item.tag.id}`;
    return `ing-${item.ingredient.id}`;
  }, []);

  const { recipesCount, recipeIds } = useMemo(
    () =>
      computeRecipeMatches({
        selectedIds,
        ingredientsByTag,
        usageMap,
      }),
    [selectedIds, ingredientsByTag, usageMap]
  );

  const { availableCount, availableCocktailIds } = useMemo(
    () =>
      computeAvailableCocktails({
        recipeIds,
        cocktails: cocktails || [],
        ingredients: ingredientsForAvailability,
        allowSubstitutes,
        ignoreGarnish,
      }),
    [
      recipeIds,
      cocktails,
      ingredientsKey,
      allowSubstitutes,
      ignoreGarnish,
      ingredientsForAvailability,
    ]
  );

  const handleClear = (): void => setSelectedIds([]);

  const handleShow = (): void => {
    if (recipeIds.length === 0) return;
    navigation.navigate("ShakerResults", {
      availableIds: availableCocktailIds,
      recipeIds,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderWithSearch
        searchValue={search}
        setSearchValue={setSearch}
        filterComponent={
          <TouchableOpacity
            onPress={() => setInStockOnly((prev) => !prev)}
            style={{ paddingVertical: 4, paddingHorizontal: 2 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={inStockOnly ? "check-circle" : "radio-button-unchecked"}
              size={22}
              color={
                inStockOnly
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
          </TouchableOpacity>
        }
      />
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={selectedIds}
        estimatedItemSize={INGREDIENT_ROW_HEIGHT}
        keyboardShouldPersistTaps="handled"
        getItemType={(item) => item.type}
        contentContainerStyle={styles.scroll}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Mark which ingredients are in stock first
            </Text>
          </View>
        }
      />
      <View style={styles.counter}>
        <TouchableOpacity
          onPress={handleClear}
          style={[
            styles.counterButton,
            styles.clearButton,
            { borderColor: theme.colors.error },
          ]}
        >
          <Text
            style={[
              styles.counterButtonText,
              { color: theme.colors.error },
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>
        <View style={styles.counterCenter}>
          <Text style={styles.counterText}>
            Cocktails available: {availableCount}
          </Text>
          <Text style={styles.counterSubText}>
            (recipes available: {recipesCount})
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleShow}
          disabled={recipesCount === 0}
          style={[
            styles.counterButton,
            recipesCount === 0
              ? {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                }
              : { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text
            style={[
              styles.counterButtonText,
              {
                color:
                  recipesCount === 0
                    ? theme.colors.primary
                    : theme.colors.onPrimary,
              },
            ]}
          >
            Show
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { paddingBottom: 16 },
    tagHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 4,
      height: 56,
    },
    tagTitle: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
      fontSize: 16,
    },
    counter: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    counterCenter: { flex: 1, alignItems: "center" },
    counterText: { fontWeight: "bold", textAlign: "center" },
    counterSubText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    counterButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    clearButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    counterButtonText: { fontWeight: "bold" },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

