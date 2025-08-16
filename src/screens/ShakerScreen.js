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

import useIngredientsData from "../hooks/useIngredientsData";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { getAllTags } from "../storage/ingredientTagsStorage";

export default function ShakerScreen() {
  const theme = useTheme();
  const { ingredients, usageMap, loading } = useIngredientsData();
  const [allTags, setAllTags] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

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
    const [first, ...rest] = selectedIds.map((id) => usageMap[id] || []);
    return rest.reduce(
      (acc, arr) => acc.filter((x) => arr.includes(x)),
      [...first]
    ).length;
  }, [selectedIds, usageMap]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {allTags.map((tag) => {
          const items = grouped.get(tag.id) || [];
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
                    <TouchableOpacity
                      key={ing.id}
                      onPress={() => toggleIngredient(ing.id)}
                      style={[
                        styles.ingredientRow,
                        active && {
                          backgroundColor: theme.colors.secondaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.ingredientText,
                          active && { color: theme.colors.onSecondaryContainer },
                        ]}
                      >
                        {ing.name}
                      </Text>
                    </TouchableOpacity>
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
  container: { flex: 1 },
  scroll: { padding: 16 },
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
  ingredientRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
  ingredientText: { fontSize: 15 },
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

