import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, SectionList } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";

import IngredientRow from "../components/IngredientRow";
import CocktailRow from "../components/CocktailRow";
import useIngredientsData from "../hooks/useIngredientsData";

// helper to add alpha to hex colors
const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

export default function ShakerScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { ingredients, cocktails } = useIngredientsData();

  const [selectedIds, setSelectedIds] = useState([]);

  const toggleIngredient = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // group ingredients by tags
  const sections = useMemo(() => {
    const map = new Map();
    ingredients.forEach((ing) => {
      const tags = Array.isArray(ing.tags) && ing.tags.length > 0
        ? ing.tags
        : [{ id: "__other", name: "Other" }];
      tags.forEach((tag) => {
        const key = String(tag.id);
        if (!map.has(key)) map.set(key, { title: tag.name, data: [] });
        map.get(key).data.push(ing);
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [ingredients]);

  // cocktails that contain all selected ingredients
  const matchingCocktails = useMemo(() => {
    if (selectedIds.length === 0) return cocktails;
    return cocktails.filter((c) =>
      selectedIds.every((id) =>
        Array.isArray(c.ingredients) &&
        c.ingredients.some((r) => r.ingredientId === id)
      )
    );
  }, [selectedIds, cocktails]);

  const renderIngredient = useCallback(
    ({ item }) => (
      <IngredientRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        tags={item.tags}
        usageCount={item.usageCount}
        singleCocktailName={item.singleCocktailName}
        inBar={item.inBar}
        baseIngredientId={item.baseIngredientId}
        onPress={toggleIngredient}
        highlightColor={
          selectedIds.includes(item.id)
            ? withAlpha(theme.colors.primary, 0.3)
            : null
        }
      />
    ),
    [toggleIngredient, selectedIds, theme.colors.primary]
  );

  const ingredientKey = useCallback((item) => String(item.id), []);

  const renderCocktail = useCallback(
    ({ item }) => (
      <CocktailRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        glassId={item.glassId}
        tags={item.tags}
        ingredientLine={null}
        rating={item.rating}
        isAllAvailable={true}
        hasBranded={false}
        onPress={(cocktailId) =>
          navigation.navigate("Cocktails", {
            screen: "CocktailDetails",
            params: { id: cocktailId },
          })
        }
      />
    ),
    [navigation]
  );

  const cocktailKey = useCallback((item) => String(item.id), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={ingredientKey}
        renderItem={renderIngredient}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
              },
            ]}
          >
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled={false}
        style={styles.ingredientsList}
      />
      <View style={styles.cocktailHeader}>
        <Text style={{ color: theme.colors.onSurface }}>
          Cocktails: {matchingCocktails.length}
        </Text>
      </View>
      <FlashList
        data={matchingCocktails}
        keyExtractor={cocktailKey}
        renderItem={renderCocktail}
        estimatedItemSize={70}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No cocktails found
            </Text>
          </View>
        }
        style={styles.cocktailsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ingredientsList: { flex: 1 },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontWeight: "bold",
  },
  cocktailHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cocktailsList: { flex: 1 },
  emptyList: { padding: 24, alignItems: "center" },
});

