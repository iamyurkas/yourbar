import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getIngredientById } from "../storage/ingredientsStorage";
import { MaterialIcons } from "@expo/vector-icons";

export default function IngredientDetailsScreen() {
  const navigation = useNavigation();
  const { id } = useRoute().params;

  const [ingredient, setIngredient] = useState(null);
  const [inBar, setInBar] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loaded = await getIngredientById(id);
      if (loaded) setIngredient(loaded);
    };
    load();
  }, [id]);

  if (!ingredient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4DABF7" />
        <Text style={{ marginTop: 12 }}>Loading ingredient...</Text>
      </View>
    );
  }

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
        <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
          <MaterialIcons name="shopping-cart" size={24} color="#4DABF7" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setInBar((prev) => !prev)}
          style={styles.iconButton}
        >
          <MaterialIcons
            name={inBar ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={inBar ? "#4DABF7" : "#999"}
          />
        </TouchableOpacity>
      </View>

      {ingredient.photoUri ? (
        <Image source={{ uri: ingredient.photoUri }} style={styles.image} />
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

      {ingredient.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description:</Text>
          <Text>{ingredient.description}</Text>
        </View>
      ) : null}

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
  editButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 12,
    padding: 4,
  },
  editText: {
    color: "#4DABF7",
    fontWeight: "bold",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontWeight: "bold",
    marginBottom: 4,
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
  actionButton: {
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  actionText: {
    fontWeight: "bold",
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
