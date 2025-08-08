import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getAllTags } from "../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  addIngredient,
  getAllIngredients,
} from "../storage/ingredientsStorage";
import { useTabMemory } from "../context/TabMemoryContext";
import {
  Menu,
  Divider,
  Provider as PaperProvider,
  Text as PaperText,
} from "react-native-paper";

export default function AddIngredientScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([
    { id: 9, name: "custom", color: "#afc9c3ff" },
  ]);
  const [availableTags, setAvailableTags] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");

  // Меню — як в EditIngredientScreen: координатний anchor, стабільний при скролі
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

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

  useFocusEffect(
    useCallback(() => {
      setName("");
      setDescription("");
      setPhotoUri(null);
      setTags([{ id: 9, name: "custom", color: "#afc9c3ff" }]);
      setBaseIngredientId(null);
      setBaseIngredientSearch("");
    }, [])
  );

  useEffect(() => {
    const loadData = async () => {
      const customTags = await getAllTags();
      const ingredients = await getAllIngredients();

      setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...customTags]);

      // тільки базові (тобто ті, що не є брендовими)
      const baseOnly = ingredients.filter((i) => !i.baseIngredientId);
      baseOnly.sort((a, b) =>
        a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
      );
      setAllIngredients(baseOnly);
    };
    loadData();
  }, []);

  const toggleTag = (tag) => {
    if (tags.find((t) => t.id === tag.id)) {
      setTags(tags.filter((t) => t.id !== tag.id));
    } else {
      setTags([...tags, tag]);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to media library");
      return;
    }

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
    if (!name.trim()) {
      Alert.alert("Please enter a name for the ingredient.");
      return;
    }

    const id = Date.now();

    const ingredient = {
      id,
      name: name.trim(),
      description,
      photoUri,
      tags,
      baseIngredientId: baseIngredientId || null,
    };

    await addIngredient(ingredient);
    navigation.navigate("IngredientDetails", { id });
  };

  const filteredBaseIngredients = allIngredients
    .filter((i) =>
      i.name.toLowerCase().includes(baseIngredientSearch.toLowerCase())
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );

  const selectedBase = allIngredients.find((i) => i.id === baseIngredientId);

  // координатне відкриття меню (накриває інпут; якщо треба — підкрути offset)
  const openMenu = () => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      setMenuAnchor({ x, y }); // якщо хочеш вище/нижче: y - 10 / y + 10
      setMenuVisible(true);
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Name:</Text>
          <TextInput
            placeholder="e.g. Lemon juice"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Photo:</Text>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.image} />
            ) : (
              <Text style={styles.imagePlaceholder}>Tap to select image</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Tags:</Text>
          <View style={styles.tagContainer}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tag, { backgroundColor: tag.color }]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={styles.tagText}>{tag.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Add Tag:</Text>
          <View style={styles.tagContainer}>
            {availableTags
              .filter((t) => !tags.some((tag) => tag.id === t.id))
              .map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tag, { backgroundColor: tag.color }]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={styles.tagText}>+ {tag.name}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <Text style={styles.label}>Base Ingredient:</Text>

          {/* Поле-якір для меню з координатним позиціонуванням */}
          <View
            ref={anchorRef}
            onLayout={(e) => setAnchorWidth(e.nativeEvent.layout.width)}
          >
            <TouchableOpacity
              onPress={openMenu}
              style={[styles.input, styles.anchorInput]}
              activeOpacity={0.7}
            >
              <View style={styles.anchorRow}>
                {selectedBase?.photoUri && (
                  <Image
                    source={{ uri: selectedBase.photoUri }}
                    style={styles.menuImg}
                  />
                )}
                <PaperText style={{ color: selectedBase ? "#111" : "#777" }}>
                  {selectedBase ? selectedBase.name : "None"}
                </PaperText>
              </View>
            </TouchableOpacity>
          </View>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={menuAnchor || { x: 0, y: 0 }}
            contentStyle={{ width: anchorWidth }}
          >
            {/* Пошук */}
            <View style={styles.menuSearchBox}>
              <TextInput
                ref={searchInputRef}
                placeholder="Search base ingredient..."
                value={baseIngredientSearch}
                onChangeText={setBaseIngredientSearch}
                style={styles.menuSearchInput}
                returnKeyType="search"
              />
            </View>
            <Divider />

            {/* Скрольний список пунктів */}
            <ScrollView
              style={{ maxHeight: 260 }}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                onPress={() => {
                  setBaseIngredientId(null);
                  setMenuVisible(false);
                }}
                style={styles.menuRow}
              >
                <View style={styles.menuRowInner}>
                  <PaperText>None</PaperText>
                </View>
              </TouchableOpacity>

              {filteredBaseIngredients.map((i) => (
                <TouchableOpacity
                  key={i.id}
                  onPress={() => {
                    setBaseIngredientId(i.id);
                    setMenuVisible(false);
                  }}
                  style={styles.menuRow}
                >
                  <View style={styles.menuRowInner}>
                    {i.photoUri ? (
                      <Image
                        source={{ uri: i.photoUri }}
                        style={styles.menuImg}
                      />
                    ) : (
                      <View
                        style={[styles.menuImg, styles.menuImgPlaceholder]}
                      />
                    )}
                    <PaperText>{i.name}</PaperText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Menu>

          <Text style={styles.label}>Description:</Text>
          <TextInput
            placeholder="Optional description"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, { height: 60 }]}
            multiline
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save Ingredient</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}

const IMAGE_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "white",
  },
  label: {
    fontWeight: "bold",
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
  },
  // Щоб меню виглядало як поле вводу
  anchorInput: {
    justifyContent: "center",
    minHeight: 44,
  },
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageButton: {
    marginTop: 8,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    color: "#777",
    textAlign: "center",
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: {
    color: "#fff",
    fontWeight: "bold",
  },
  // Пошукове поле в меню
  menuSearchBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuSearchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  menuImgPlaceholder: {
    backgroundColor: "#eee",
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: "#4DABF7",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
});
