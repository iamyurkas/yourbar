import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { useNavigation, useRoute } from "@react-navigation/native";
import {
  getIngredientById,
  getAllIngredients,
  saveIngredient,
} from "../storage/ingredientsStorage";
import { MaterialIcons } from "@expo/vector-icons";
import { useTabMemory } from "../context/TabMemoryContext";

export default function IngredientDetailsScreen() {
  const navigation = useNavigation();
  const { id } = useRoute().params;

  const [ingredient, setIngredient] = useState(null);
  const [allIngredients, setAllIngredients] = useState([]);
  const [brandedChildren, setBrandedChildren] = useState([]);
  const [baseIngredient, setBaseIngredient] = useState(null);

  const toggleInBar = async () => {
    const updated = { ...ingredient, inBar: !ingredient.inBar };
    await saveIngredient(updated);
    setIngredient(updated);
  };

  const toggleInShoppingList = async () => {
    const updated = {
      ...ingredient,
      inShoppingList: !ingredient.inShoppingList,
    };
    await saveIngredient(updated);
    setIngredient(updated);
  };

  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");

  const handleGoBack = () => {
    if (previousTab) {
      navigation.navigate(previousTab);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      handleGoBack();
    });

    return unsubscribe;
  }, [navigation, previousTab]);

  useEffect(() => {
    const load = async () => {
      const loaded = await getIngredientById(id);
      const all = await getAllIngredients();
      setIngredient(loaded || null);
      setAllIngredients(all);

      if (loaded) {
        // Діти (брендовані) цього інгредієнта
        const children = all
          .filter((i) => i.baseIngredientId === loaded.id)
          .sort((a, b) =>
            a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
          );
        setBrandedChildren(children);

        // Його базовий (якщо це брендований)
        const base = loaded.baseIngredientId
          ? all.find((i) => i.id === loaded.baseIngredientId)
          : null;
        setBaseIngredient(base || null);
      } else {
        setBrandedChildren([]);
        setBaseIngredient(null);
      }
    };
    load();
  }, [id]);

  // Перераховуємо зв’язки, якщо змінився ingredient (наприклад, тумблери)
  useEffect(() => {
    if (!ingredient || allIngredients.length === 0) return;
    const children = allIngredients
      .filter((i) => i.baseIngredientId === ingredient.id)
      .sort((a, b) =>
        a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
      );
    setBrandedChildren(children);

    const base = ingredient.baseIngredientId
      ? allIngredients.find((i) => i.id === ingredient.baseIngredientId)
      : null;
    setBaseIngredient(base || null);
  }, [ingredient, allIngredients]);

  if (!ingredient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4DABF7" />
        <Text style={{ marginTop: 12 }}>Loading ingredient...</Text>
      </View>
    );
  }

  const isBase = brandedChildren.length > 0;
  const isBranded = !!ingredient.baseIngredientId;

  const goToIngredient = (goId) => {
    navigation.push("IngredientDetails", { id: goId });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{ingredient.name}</Text>

      <View style={styles.iconRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("EditIngredient", { id })}
          style={styles.iconButton}
        >
          <MaterialIcons name="edit" size={24} color="#4DABF7" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleInShoppingList}
          style={styles.iconButton}
        >
          <MaterialIcons
            name={
              ingredient.inShoppingList ? "shopping-cart" : "add-shopping-cart"
            }
            size={24}
            color={ingredient.inShoppingList ? "#4DABF7" : "#999"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleInBar} style={styles.iconButton}>
          <MaterialIcons
            name={ingredient.inBar ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={ingredient.inBar ? "#4DABF7" : "#999"}
          />
        </TouchableOpacity>
      </View>

      {ingredient.photoUri ? (
        <Image
          source={{ uri: ingredient.photoUri }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View
          style={[
            styles.image,
            {
              backgroundColor: "#eee",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={{ color: "#aaa" }}>No image</Text>
        </View>
      )}

      {/* Tags */}
      {Array.isArray(ingredient.tags) && ingredient.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tags:</Text>
          <View style={styles.tagRow}>
            {ingredient.tags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tag, { backgroundColor: tag.color }]}
              >
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      {ingredient.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description:</Text>
          <Text>{ingredient.description}</Text>
        </View>
      ) : null}

      {/* Base / Branded relations */}
      <View style={styles.section}>
        {isBase ? (
          <>
            <Text style={styles.sectionLabel}>Branded ingredients:</Text>
            <View style={styles.listBox}>
              {brandedChildren.map((child, idx) => (
                <View key={child.id}>
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => goToIngredient(child.id)}
                    activeOpacity={0.7}
                  >
                    {child.photoUri ? (
                      <Image
                        source={{ uri: child.photoUri }}
                        style={styles.thumb}
                      />
                    ) : null}
                    <Text style={styles.rowText}>{child.name}</Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                  {idx !== brandedChildren.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </>
        ) : isBranded && baseIngredient ? (
          <>
            <Text style={styles.sectionLabel}>Base ingredient:</Text>
            <TouchableOpacity
              style={[styles.row, styles.singleRow]}
              onPress={() => goToIngredient(baseIngredient.id)}
              activeOpacity={0.7}
            >
              {baseIngredient.photoUri ? (
                <Image
                  source={{ uri: baseIngredient.photoUri }}
                  style={styles.thumb}
                />
              ) : null}
              <Text style={styles.rowText}>{baseIngredient.name}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Used in cocktails:</Text>
        <Text style={{ fontStyle: "italic", color: "#888" }}>
          (coming soon)
        </Text>
      </View>

      <TouchableOpacity style={styles.addCocktailButton}>
        <Text style={styles.addCocktailText}>+ Add Cocktail</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const IMAGE_SIZE = 140;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 24,
    backgroundColor: "white",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    color: "white",
    fontWeight: "bold",
  },

  // Relations box
  listBox: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  singleRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  rowText: {
    flex: 1,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#e9e9e9",
    marginLeft: 8 + 40 + 10, // відступ під текст (під картинку)
  },

  addCocktailButton: {
    marginTop: 24,
    backgroundColor: "#4DABF7",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addCocktailText: {
    color: "white",
    fontWeight: "bold",
  },
  iconRow: {
    flexDirection: "row",
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 12,
  },
  iconButton: {
    marginLeft: 12,
    padding: 4,
  },
});
