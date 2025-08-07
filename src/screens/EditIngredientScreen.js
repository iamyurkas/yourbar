import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  saveIngredient,
  deleteIngredient,
  getIngredientById,
} from "../storage/ingredientsStorage";
import { getAllTags } from "../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";

export default function EditIngredientScreen() {
  const navigation = useNavigation();
  const { id } = useRoute().params;

  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);

  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    const loadTags = async () => {
      const custom = await getAllTags();
      setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...custom]);
    };
    loadTags();
  }, []);

  useEffect(() => {
    const load = async () => {
      const ingredient = await getIngredientById(id);
      if (ingredient) {
        setName(ingredient.name);
        setPhotoUri(ingredient.photoUri);
        setDescription(ingredient.description || "");
        setTags(ingredient.tags || []);
      }
    };
    load();
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const updatedIngredient = {
      id,
      name,
      photoUri,
      description,
      tags,
    };
    await saveIngredient(updatedIngredient);
    navigation.navigate("IngredientDetails", { id });
  };

  const handleDelete = () => {
    Alert.alert("Delete ingredient", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteIngredient(id);
          navigation.navigate("IngredientsTabs", { screen: "All" });
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity onPress={pickImage}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>Pick a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.tagRow}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.tag, { backgroundColor: tag.color }]}
            onPress={() => setTags(tags.filter((t) => t.id !== tag.id))}
          >
            <Text style={styles.tagText}>{tag.name}</Text>
          </TouchableOpacity>
        ))}
        {availableTags.map((tag) => {
          const exists = tags.some((t) => t.id === tag.id);
          if (exists) return null;
          return (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tag, { backgroundColor: "#ccc" }]}
              onPress={() => setTags([...tags, tag])}
            >
              <Text style={styles.tagText}>+ {tag.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.textarea}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Ingredient</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const IMAGE_SIZE = 140;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    marginTop: 12,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  placeholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
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
  saveButton: {
    backgroundColor: "#4DABF7",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
  deleteButton: {
    marginTop: 16,
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  deleteText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
