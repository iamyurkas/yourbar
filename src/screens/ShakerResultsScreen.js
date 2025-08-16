import React, { useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "react-native-paper";

import CocktailRow, { COCKTAIL_ROW_HEIGHT } from "../components/CocktailRow";
import useIngredientsData from "../hooks/useIngredientsData";

export default function ShakerResultsScreen({ route, navigation }) {
  const { ids = [] } = route.params || {};
  const theme = useTheme();
  const { cocktails, ingredients, loading } = useIngredientsData();

  const data = useMemo(() => {
    const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );
    return cocktails
      .filter((c) => ids.includes(c.id))
      .map((c) => {
        const required = (c.ingredients || []).filter((r) => !r.optional);
        const missing = [];
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
            if (missingName) missing.push(missingName);
            allAvail = false;
          }
        }
        const branded = (c.ingredients || []).some((r) => {
          const ing = ingMap.get(String(r.ingredientId));
          return ing && ing.baseIngredientId != null;
        });
        let ingredientLine = ingredientNames.join(", ");
        if (!allAvail) {
          if (missing.length > 0 && missing.length <= 2) {
            ingredientLine = `Missing: ${missing.join(", ")}`;
          } else if (missing.length >= 3 || missing.length === 0) {
            ingredientLine = `Missing: ${
              missing.length || required.length
            } ingredients`;
          }
        }
        return {
          ...c,
          ingredientLine,
          isAllAvailable: allAvail,
          hasBranded: branded,
        };
      });
  }, [cocktails, ingredients, ids]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

