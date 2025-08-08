import React, { useEffect, useState, useRef } from "react";
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
  getAllIngredients,
} from "../storage/ingredientsStorage";
import { getAllTags } from "../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { Menu, Divider, Text as PaperText, useTheme } from "react-native-paper";
import { useTabMemory } from "../context/TabMemoryContext";

export default function EditIngredientScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { id } = useRoute().params;

  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");

  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const [allBaseIngredients, setAllBaseIngredients] = useState([]);
  const [brandedChildren, setBrandedChildren] = useState([]);
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  const initialDataRef = useRef(null);

  useEffect(() => {
    const loadAll = async () => {
      const custom = await getAllTags();
      setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...custom]);

      const ing = await getIngredientById(id);
      if (ing) {
        setName(ing.name || "");
        setPhotoUri(ing.photoUri || null);
        setDescription(ing.description || "");
        setTags(Array.isArray(ing.tags) ? ing.tags : []);
        setBaseIngredientId(
          ing.baseIngredientId !== undefined ? ing.baseIngredientId : null
        );

        initialDataRef.current = {
          name: ing.name || "",
          photoUri: ing.photoUri || null,
          description: ing.description || "",
          tags: Array.isArray(ing.tags) ? ing.tags : [],
          baseIngredientId:
            ing.baseIngredientId !== undefined ? ing.baseIngredientId : null,
        };
      }

      const all = await getAllIngredients();
      const baseOnly = all.filter((i) => !i.baseIngredientId);
      baseOnly.sort((a, b) =>
        a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
      );
      setAllBaseIngredients(baseOnly);
      setBrandedChildren(all.filter((i) => i.baseIngredientId === id));
    };

    loadAll();
  }, [id]);

  const hasChanges = () => {
    if (!initialDataRef.current) return false;
    const init = initialDataRef.current;
    return (
      name !== init.name ||
      photoUri !== init.photoUri ||
      description !== init.description ||
      baseIngredientId !== init.baseIngredientId ||
      JSON.stringify(tags) !== JSON.stringify(init.tags)
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasChanges()) return;
      e.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Are you sure you want to go back without saving?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, name, photoUri, description, tags, baseIngredientId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter the ingredient name.");
      return;
    }

    const updatedIngredient = {
      id,
      name: name.trim(),
      photoUri,
      description,
      tags,
      baseIngredientId: baseIngredientId || null,
    };

    await saveIngredient(updatedIngredient);
    navigation.navigate("IngredientDetails", { id });
  };

  const handleDelete = () => {
    const hasChildren = brandedChildren.length > 0;
    const message = hasChildren
      ? `This ingredient is a base and has ${brandedChildren.length} branded item(s) linked.\n\nIf you delete it, all linked branded ingredients will become base ingredients.\n\nDelete anyway?`
      : "Delete ingredient?";

    Alert.alert("Delete ingredient", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (hasChildren) {
            const all = await getAllIngredients();
            const children = all.filter((i) => i.baseIngredientId === id);
            for (const ch of children) {
              await saveIngredient({ ...ch, baseIngredientId: null });
            }
          }
          await deleteIngredient(id);
          if (previousTab) {
            navigation.navigate(previousTab);
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const toggleAddTag = (tag) =>
    setTags((prev) =>
      prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]
    );
  const removeTag = (tag) =>
    setTags((prev) => prev.filter((t) => t.id !== tag.id));

  const filteredBase = allBaseIngredients
    .filter((i) => i.id !== id)
    .filter((i) =>
      i.name.toLowerCase().includes(baseIngredientSearch.toLowerCase())
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );

  const selectedBase = allBaseIngredients.find(
    (i) => i.id === baseIngredientId
  );
  const hasChildren = brandedChildren.length > 0;
  const isBase = hasChildren;

  const openMenu = () => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w) => {
      setAnchorWidth(w);
      // той самий координатний підхід, що й у create-екрані
      setMenuAnchor({ x, y }); // за потреби можна підкрутити y +/- декілька px
      setMenuVisible(true);
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  };

  const unlinkChild = async (child) => {
    const updated = { ...child, baseIngredientId: null };
    await saveIngredient(updated);
    const all = await getAllIngredients();
    setBrandedChildren(all.filter((i) => i.baseIngredientId === id));
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        placeholder="Name"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          styles.input,
          {
            borderColor: theme.colors.outline,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surface,
          },
        ]}
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
          <View
            style={[
              styles.image,
              styles.placeholder,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={{ color: theme.colors.placeholder }}>
              Pick a photo
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Tags */}
      <View style={styles.tagRow}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[styles.tag, { backgroundColor: tag.color }]}
            onPress={() => removeTag(tag)}
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
              style={[styles.tag, { backgroundColor: theme.colors.outline }]}
              onPress={() => toggleAddTag(tag)}
            >
              <Text
                style={[styles.tagText, { color: theme.colors.placeholder }]}
              >
                + {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Base Ingredient:</Text>

      {isBase ? (
        <View
          style={[
            styles.baseInfoBox,
            { borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Text
            style={[styles.baseInfoText, { color: theme.colors.onSurface }]}
          >
            This ingredient is currently a{" "}
            <Text style={{ fontWeight: "bold" }}>base</Text> because it has
            branded items linked to it.
          </Text>

          <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>
            Branded ingredients linked to this base:
          </Text>

          {brandedChildren.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>None</Text>
          ) : (
            brandedChildren.map((child) => (
              <View
                key={child.id}
                style={[
                  styles.childRow,
                  { borderBottomColor: theme.colors.outlineVariant },
                ]}
              >
                {child.photoUri ? (
                  <Image
                    source={{ uri: child.photoUri }}
                    style={styles.menuImg}
                  />
                ) : (
                  <View
                    style={[
                      styles.menuImg,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  />
                )}
                <Text
                  style={[styles.childName, { color: theme.colors.onSurface }]}
                >
                  {child.name}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.unlinkBtn,
                    {
                      backgroundColor: theme.colors.errorContainer,
                      borderColor: theme.colors.error,
                    },
                  ]}
                  onPress={() => unlinkChild(child)}
                >
                  <Text
                    style={[
                      styles.unlinkText,
                      { color: theme.colors.onErrorContainer },
                    ]}
                  >
                    Unlink
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            To convert this into a regular ingredient, unlink all branded items.
          </Text>
        </View>
      ) : (
        <>
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
                  backgroundColor: theme.colors.surface, // як у create-екрані
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
              width: anchorWidth,
              backgroundColor: theme.colors.surface, // 👈 такий самий фон меню
            }}
          >
            {/* Пошук у меню */}
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
                    backgroundColor: theme.colors.background, // інпут на контрастному фоні
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

              {filteredBase.map((i) => (
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
                        style={[
                          styles.menuImg,
                          { backgroundColor: theme.colors.surface },
                        ]}
                      />
                    )}
                    <PaperText>{i.name}</PaperText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Menu>
        </>
      )}

      <TextInput
        placeholder="Description"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={description}
        onChangeText={setDescription}
        multiline
        style={[
          styles.textarea,
          {
            borderColor: theme.colors.outline,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSave}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
          Save
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
        onPress={handleDelete}
      >
        <Text style={{ color: theme.colors.onError, fontWeight: "bold" }}>
          Delete Ingredient
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const IMAGE_SIZE = 140;

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
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
  textarea: {
    borderWidth: 1,
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
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
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
  },
  baseInfoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  baseInfoText: {
    // колір підставляємо в рендері з теми
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  childName: {
    flex: 1,
    fontSize: 15,
  },
  unlinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  unlinkText: {
    fontWeight: "600",
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
