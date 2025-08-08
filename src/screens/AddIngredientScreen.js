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
import { Menu, Divider, Text as PaperText, useTheme } from "react-native-paper";

export default function AddIngredientScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([
    { id: 9, name: "custom", color: "#AFC9C3FF" },
  ]);
  const [availableTags, setAvailableTags] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");

  // Меню з координатним anchor
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");

  const handleGoBack = () => {
    if (previousTab) navigation.navigate(previousTab);
    else navigation.goBack();
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
      setTags([{ id: 9, name: "custom", color: "#AFC9C3FF" }]);
      setBaseIngredientId(null);
      setBaseIngredientSearch("");
    }, [])
  );

  useEffect(() => {
    const loadData = async () => {
      const customTags = await getAllTags();
      const ingredients = await getAllIngredients();

      setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...customTags]);

      // тільки базові (не брендові)
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

  const openMenu = () => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      setMenuAnchor({ x, y: y + h }); // 👈 нижче поля
      setMenuVisible(true);
      requestAnimationFrame(() => {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      });
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[styles.container]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Name:
        </Text>
        <TextInput
          placeholder="e.g. Lemon juice"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            {
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surface,
            },
          ]}
        />

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Photo:
        </Text>
        <TouchableOpacity
          style={[
            styles.imageButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          onPress={pickImage}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} />
          ) : (
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              Tap to select image
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Tags:
        </Text>
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

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Add Tag:
        </Text>
        <View style={styles.tagContainer}>
          {availableTags
            .filter((t) => !tags.some((tag) => tag.id === t.id))
            .map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tag,
                  {
                    backgroundColor: tag.color || theme.colors.outline, // fallback
                  },
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    // якщо фон світлий — підставимо темний текст
                    { color: "#fff" },
                  ]}
                >
                  + {tag.name}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Base Ingredient:
        </Text>

        {/* Поле-якір для меню з координатним позиціонуванням */}
        <View
          ref={anchorRef}
          onLayout={(e) => setAnchorWidth(e.nativeEvent.layout.width)}
        >
          <TouchableOpacity
            onPress={openMenu}
            style={[
              styles.input,
              styles.anchorInput,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.anchorRow}>
              {selectedBase?.photoUri && (
                <Image
                  source={{ uri: selectedBase.photoUri }}
                  style={styles.menuImg}
                />
              )}
              <PaperText
                style={{
                  color: selectedBase
                    ? theme.colors.onSurface
                    : theme.colors.onSurfaceVariant,
                }}
              >
                {selectedBase ? selectedBase.name : "None"}
              </PaperText>
            </View>
          </TouchableOpacity>
        </View>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={menuAnchor || { x: 0, y: 0 }}
          contentStyle={{
            width: anchorWidth, // 👈 така ж ширина, як у поля
            backgroundColor: theme.colors.surface,
          }}
        >
          <View style={styles.menuSearchBox}>
            <TextInput
              ref={searchInputRef}
              placeholder="Search base ingredient..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={baseIngredientSearch}
              onChangeText={setBaseIngredientSearch}
              style={[
                styles.menuSearchInput,
                {
                  borderColor: theme.colors.outline,
                  color: theme.colors.onSurface,
                  backgroundColor: theme.colors.background,
                },
              ]}
              returnKeyType="search"
            />
          </View>
          <Divider />
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
                    <View style={[styles.menuImg, styles.menuImgPlaceholder]} />
                  )}
                  <PaperText>{i.name}</PaperText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Menu>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Description:
        </Text>
        <TextInput
          placeholder="Optional description"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={description}
          onChangeText={setDescription}
          style={[
            styles.input,
            {
              height: 60,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surface,
            },
          ]}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save Ingredient
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const IMAGE_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  label: {
    fontWeight: "bold",
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
  },
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
    borderWidth: 1,
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
    color: "white",
    fontWeight: "bold",
  },
  menuSearchBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuSearchInput: {
    borderWidth: 1,
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
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
