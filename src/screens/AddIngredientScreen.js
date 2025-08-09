import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
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
  InteractionManager,
  ActivityIndicator,
  FlatList, // 👈 для меню (стабільний скрол)
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme, Menu, Divider, Text as PaperText } from "react-native-paper";

import { getAllTags } from "../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import {
  addIngredient,
  getAllIngredients,
} from "../storage/ingredientsStorage";
import { useTabMemory } from "../context/TabMemoryContext";

// ----------- helpers -----------
const useDebounced = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const IMAGE_SIZE = 120;
const MENU_ROW_HEIGHT = 56;

// pills for tags (memo)
const TagPill = memo(({ tag, onPress }) => (
  <TouchableOpacity
    style={[styles.tag, { backgroundColor: tag.color || "#ccc" }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.tagText}>{tag.name}</Text>
  </TouchableOpacity>
));

// row in base menu (memo)
const BaseRow = memo(({ item, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.menuRow}
    activeOpacity={0.7}
  >
    <View style={styles.menuRowInner}>
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.menuImg} />
      ) : (
        <View style={[styles.menuImg, styles.menuImgPlaceholder]} />
      )}
      <PaperText numberOfLines={1}>{item.name}</PaperText>
    </View>
  </TouchableOpacity>
));

export default function AddIngredientScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");

  // form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([
    { id: 10, name: "other", color: "#AFC9C3FF" },
  ]);

  // reference lists
  const [availableTags, setAvailableTags] = useState([]); // builtin + custom

  // base list (lazy)
  const [baseOnlySorted, setBaseOnlySorted] = useState([]);
  const [basesLoaded, setBasesLoaded] = useState(false);
  const [loadingBases, setLoadingBases] = useState(false);

  // base link
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const selectedBase = useMemo(
    () => baseOnlySorted.find((i) => i.id === baseIngredientId),
    [baseOnlySorted, baseIngredientId]
  );

  // search in base menu
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const filteredBase = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return baseOnlySorted;
    return baseOnlySorted.filter((i) => i.name.toLowerCase().includes(q));
  }, [baseOnlySorted, debouncedQuery]);

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  // go back fast
  const handleGoBack = useCallback(() => {
    if (previousTab) navigation.navigate(previousTab);
    else navigation.goBack();
  }, [navigation, previousTab]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      handleGoBack();
    });
    return unsub;
  }, [navigation, handleGoBack]);

  // reset form on focus
  useEffect(() => {
    if (!isFocused) return;
    setName("");
    setDescription("");
    setPhotoUri(null);
    setTags([{ id: 10, name: "custom", color: "#AFC9C3FF" }]);
    setBaseIngredientId(null);
    setBaseIngredientSearch("");
  }, [isFocused]);

  // load tags immediately (no waiting for bases)
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    getAllTags().then((customTags) => {
      if (cancelled) return;
      const mergedTags = [...BUILTIN_INGREDIENT_TAGS, ...customTags];
      setAvailableTags(mergedTags);
    });

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  // lazy-load bases
  const loadBases = useCallback(async () => {
    if (basesLoaded || loadingBases) return;
    setLoadingBases(true);
    try {
      // після анімацій, щоб не блокувати перехід
      await InteractionManager.runAfterInteractions();
      const ingredients = await getAllIngredients();
      const baseOnly = ingredients.filter((i) => !i.baseIngredientId);
      baseOnly.sort((a, b) =>
        a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
      );
      setBaseOnlySorted(baseOnly);
      setBasesLoaded(true);
    } finally {
      setLoadingBases(false);
    }
  }, [basesLoaded, loadingBases]);

  // optional: м’який префетч баз після першого рендера
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => {
      // префетч лише якщо користувач ще не відкрив меню
      if (!basesLoaded && !loadingBases) {
        loadBases().catch(() => {});
      }
    }, 500); // через півсекунди після відкриття екрана
    return () => clearTimeout(t);
  }, [isFocused, basesLoaded, loadingBases, loadBases]);

  const toggleTag = useCallback((tag) => {
    setTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  }, []);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to media library");
      return;
    }
    await InteractionManager.runAfterInteractions();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }, []);

  const handleSave = useCallback(async () => {
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
  }, [name, description, photoUri, tags, baseIngredientId, navigation]);

  const openMenu = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      setMenuAnchor({ x, y: y + h });
      setMenuVisible(true);
      // запускаємо підвантаження баз (якщо ще не)
      loadBases();
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  }, [loadBases]);

  // ---- render ----
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
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
          activeOpacity={0.7}
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
            <TagPill key={tag.id} tag={tag} onPress={() => toggleTag(tag)} />
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Add Tag:
        </Text>
        <View style={styles.tagContainer}>
          {availableTags
            .filter((t) => !tags.some((tag) => tag.id === t.id))
            .map((tag) => (
              <TagPill key={tag.id} tag={tag} onPress={() => toggleTag(tag)} />
            ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Base Ingredient:
        </Text>

        {/* Поле-якір для меню з координатним позиціонуванням */}
        <View
          ref={anchorRef}
          collapsable={false}
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
                {selectedBase
                  ? selectedBase.name
                  : basesLoaded
                  ? "None"
                  : "(loading...)"}
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

          {loadingBases ? (
            <View
              style={{
                height: 120,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator />
              <Text
                style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
              >
                Loading...
              </Text>
            </View>
          ) : (
            <FlatList
              data={[{ id: "__none__", name: "None" }, ...filteredBase]}
              keyExtractor={(item, i) => String(item.id ?? i)}
              renderItem={({ item }) =>
                item.id === "__none__" ? (
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
                ) : (
                  <BaseRow
                    item={item}
                    onPress={() => {
                      setBaseIngredientId(item.id);
                      setMenuVisible(false);
                    }}
                  />
                )
              }
              // 👇 фіксована висота => стабільний скрол усередині меню
              style={{
                height: Math.min(
                  300,
                  MENU_ROW_HEIGHT * (filteredBase.length + 1)
                ),
              }}
              keyboardShouldPersistTaps="handled"
            />
          )}
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
          activeOpacity={0.7}
          disabled={!name.trim()}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save Ingredient
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  label: { fontWeight: "bold", marginTop: 16 },
  input: { borderWidth: 1, padding: 10, marginTop: 8, borderRadius: 8 },
  anchorInput: { justifyContent: "center", minHeight: 44 },
  anchorRow: { flexDirection: "row", alignItems: "center", gap: 8 },

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
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, resizeMode: "cover" },

  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: { color: "white", fontWeight: "bold" },

  menuSearchBox: { paddingHorizontal: 12, paddingVertical: 8 },
  menuSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuRow: { paddingHorizontal: 12, paddingVertical: 8 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuImg: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#fff" },
  menuImgPlaceholder: { backgroundColor: "#eee" },

  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
