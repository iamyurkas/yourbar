import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

import HeaderWithSearch from "../components/HeaderWithSearch";
import IngredientRow from "../components/IngredientRow";
import useIngredientsData from "../hooks/useIngredientsData";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { getAllTags } from "../storage/ingredientTagsStorage";

export default function ShakerScreen() {
  const theme = useTheme();
  const { ingredients, usageMap, loading } = useIngredientsData();
  const [allTags, setAllTags] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

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
    const q = search.trim().toLowerCase();
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

  const cocktailsCount = useMemo(() => {
    if (selectedIds.length === 0) return 0;

    // group selected ingredients by tag
    const groups = new Map();
    grouped.forEach((items, tagId) => {
      const selected = items
        .filter((ing) => selectedIds.includes(ing.id))
        .map((ing) => ing.id);
      if (selected.length > 0) groups.set(tagId, selected);
    });

    if (groups.size === 0) return 0;

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

    return intersection ? intersection.size : 0;
  }, [selectedIds, usageMap, grouped]);

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
          <Switch value={inStockOnly} onValueChange={setInStockOnly} />
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
                  color="#fff"
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
                      usageCount={0}
                      inBar={ing.inBar}
                      inShoppingList={ing.inShoppingList}
                      onPress={toggleIngredient}
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
        <Text style={styles.counterText}>Cocktails available: {cocktailsCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingBottom: 16 },
  section: { marginBottom: 12 },
  tagHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  tagTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  counter: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    alignItems: "center",
  },
  counterText: { fontWeight: "bold" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

