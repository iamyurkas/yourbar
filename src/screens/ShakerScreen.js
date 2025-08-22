import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

import HeaderWithSearch from "../components/HeaderWithSearch";
import IngredientRow from "../components/IngredientRow";
import useIngredientsData from "../hooks/useIngredientsData";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { getAllTags } from "../storage/ingredientTagsStorage";
import { normalizeSearch } from "../utils/normalizeSearch";
import {
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../storage/settingsStorage";

export default function ShakerScreen({ navigation }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { ingredients, cocktails, usageMap, loading } = useIngredientsData();
  const [allTags, setAllTags] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = await getAllTags();
      if (!cancelled)
        setAllTags([...BUILTIN_INGREDIENT_TAGS, ...(custom || [])]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    allTags.forEach((t) => map.set(t.id, []));
    ingredients.forEach((ing) => {
      if (Array.isArray(ing.tags)) {
        ing.tags.forEach((tag) => {
          if (map.has(tag.id)) map.get(tag.id).push(ing);
        });
      }
    });
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [allTags, ingredients]);

  const filteredGrouped = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return grouped;
    const map = new Map();
    grouped.forEach((items, id) => {
      const filtered = items.filter((i) => i.searchName.includes(q));
      if (filtered.length) map.set(id, filtered);
    });
    return map;
  }, [grouped, search]);

  const displayGrouped = useMemo(() => {
    if (!inStockOnly) return filteredGrouped;
    const map = new Map();
    filteredGrouped.forEach((items, id) => {
      const filtered = items.filter((i) => i.inBar);
      if (filtered.length) map.set(id, filtered);
    });
    return map;
  }, [filteredGrouped, inStockOnly]);

  const toggleTag = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleIngredient = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allow = await getAllowSubstitutes();
      if (!cancelled) setAllowSubstitutes(!!allow);
    })();
    const sub = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const { recipesCount, recipeIds } = useMemo(() => {
    if (selectedIds.length === 0) return { recipesCount: 0, recipeIds: [] };

    const groups = new Map();
    grouped.forEach((items, tagId) => {
      const selected = items
        .filter((ing) => selectedIds.includes(ing.id))
        .map((ing) => ing.id);
      if (selected.length > 0) groups.set(tagId, selected);
    });

    if (groups.size === 0) return { recipesCount: 0, recipeIds: [] };

    let intersection;
    groups.forEach((ids) => {
      const union = new Set();
      ids.forEach((id) => {
        (usageMap[id] || []).forEach((cid) => union.add(cid));
      });
      if (!intersection) {
        intersection = union;
      } else {
        intersection = new Set(
          [...intersection].filter((cid) => union.has(cid))
        );
      }
    });

    const result = intersection ? [...intersection] : [];
    return { recipesCount: result.length, recipeIds: result };
  }, [selectedIds, usageMap, grouped]);

  const { availableCount, availableCocktailIds } = useMemo(() => {
    if (recipeIds.length === 0)
      return { availableCount: 0, availableCocktailIds: [] };

    const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
    const findBrand = (baseId) =>
      ingredients.find(
        (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
      );

    const isSatisfied = (r) => {
      const ing = ingMap.get(String(r.ingredientId));
      if (ing?.inBar) return true;
      const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
      if (allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingMap.get(baseId);
        if (base?.inBar) return true;
      }
      const isBaseIngredient = ing?.baseIngredientId == null;
      if (allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient) {
        const brand = findBrand(baseId);
        if (brand) return true;
      }
      if (Array.isArray(r.substitutes)) {
        for (const s of r.substitutes) {
          const candidate = ingMap.get(String(s.id));
          if (candidate?.inBar) return true;
        }
      }
      return false;
    };

    const ids = [];
    (cocktails || []).forEach((c) => {
      if (!recipeIds.includes(c.id)) return;
      const required = (c.ingredients || []).filter((r) => !r.optional);
      if (required.length === 0) return;
      for (const r of required) {
        if (!isSatisfied(r)) return;
      }
      ids.push(c.id);
    });

    return { availableCount: ids.length, availableCocktailIds: ids };
  }, [recipeIds, cocktails, ingredients, allowSubstitutes]);

  const handleClear = () => setSelectedIds([]);

  const handleShow = () => {
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
      <ScrollView contentContainerStyle={styles.scroll}>
        {allTags.map((tag) => {
          const items = displayGrouped.get(tag.id) || [];
          if (items.length === 0) return null;
          const isOpen = expanded[tag.id];
          return (
            <View key={tag.id} style={styles.section}>
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
              {isOpen &&
                items.map((ing) => {
                  const active = selectedIds.includes(ing.id);
                  return (
                    <IngredientRow
                      key={ing.id}
                      id={ing.id}
                      name={ing.name}
                      photoUri={ing.photoUri}
                      usageCount={ing.usageCount}
                      singleCocktailName={ing.singleCocktailName}
                      showMake
                      inBar={ing.inBar}
                      inShoppingList={ing.inShoppingList}
                      baseIngredientId={ing.baseIngredientId}
                      onPress={toggleIngredient}
                      onDetails={(id) =>
                        navigation.push("IngredientDetails", { id })
                      }
                      highlightColor={
                        active ? theme.colors.secondaryContainer : undefined
                      }
                    />
                  );
                })}
            </View>
          );
        })}
      </ScrollView>
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
    section: { marginBottom: 12 },
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

