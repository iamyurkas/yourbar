// src/screens/Ingredients/AddIngredientScreen.js
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
  useDeferredValue,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
  ActivityIndicator,
  FlatList,
  Pressable,
  BackHandler,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import { useTheme, Menu, Divider, Text as PaperText } from "react-native-paper";
import { HeaderBackButton } from "@react-navigation/elements";

import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import {
  addIngredient,
  getAllIngredients,
} from "../../storage/ingredientsStorage";
import { useTabMemory } from "../../context/TabMemoryContext";
import IngredientTagsModal from "../../components/IngredientTagsModal";
import useIngredientsData from "../../hooks/useIngredientsData";

/* ---------------- helpers ---------------- */
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
const RIPPLE = { color: "#E3F2FD" };

/* -------------- pills for tags (memo) -------------- */
const TagPill = memo(function TagPill({ id, name, color, onToggle }) {
  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={RIPPLE}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: color || "#ccc" },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={styles.tagText}>{name}</Text>
    </Pressable>
  );
});

/* -------------- row in base menu (memo) -------------- */
const BaseRow = memo(function BaseRow({ id, name, photoUri, onSelect }) {
  return (
    <Pressable
      onPress={() => onSelect(id)}
      android_ripple={RIPPLE}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { opacity: 0.96, transform: [{ scale: 0.997 }] },
      ]}
    >
      <View style={styles.menuRowInner}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.menuImg} />
        ) : (
          <View style={[styles.menuImg, styles.menuImgPlaceholder]} />
        )}
        <PaperText numberOfLines={1}>{name}</PaperText>
      </View>
    </Pressable>
  );
});

export default function AddIngredientScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { getTab } = useTabMemory();
  const { refresh: refreshIngredientsData } = useIngredientsData();

  // read incoming params
  const initialNameParam = route.params?.initialName || "";
  const targetLocalId = route.params?.targetLocalId;
  const returnTo = route.params?.returnTo || "AddCocktail";
  const fromCocktailFlow = targetLocalId != null;
  const lastIngredientsTab =
    (typeof getTab === "function" && getTab("ingredients")) || "All";

  // form state
  const [name, setName] = useState(initialNameParam);
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([
    { id: 10, name: "other", color: "#AFC9C3FF" },
  ]);

  // reference lists
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [tagsModalAutoAdd, setTagsModalAutoAdd] = useState(false);

  const loadAvailableTags = useCallback(async () => {
    const custom = await getAllTags();
    setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...(custom || [])]);
  }, []);

  const closeTagsModal = () => {
    setTagsModalVisible(false);
    setTagsModalAutoAdd(false);
    loadAvailableTags();
  };

  const openAddTagModal = () => {
    setTagsModalAutoAdd(true);
    setTagsModalVisible(true);
  };

  // base list
  const [baseOnlySorted, setBaseOnlySorted] = useState([]);
  const [basesLoaded, setBasesLoaded] = useState(false);
  const [loadingBases, setLoadingBases] = useState(false);

  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const selectedBase = useMemo(
    () => baseOnlySorted.find((i) => i.id === baseIngredientId),
    [baseOnlySorted, baseIngredientId]
  );

  // search in base menu
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filteredBase = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return baseOnlySorted;
    return baseOnlySorted.filter((i) => i.nameLower.includes(q));
  }, [baseOnlySorted, deferredQuery]);

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);
  const isMountedRef = useRef(true);

  /* ---------- Back button logic ---------- */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: (props) =>
        fromCocktailFlow ? (
          <HeaderBackButton
            {...props}
            onPress={() =>
              navigation.navigate("Cocktails", { screen: returnTo })
            }
            labelVisible={false}
          />
        ) : (
          <HeaderBackButton
            {...props}
            onPress={() =>
              navigation.replace("IngredientsMain", { screen: lastIngredientsTab })
            }
            labelVisible={false}
          />
        ),
    });
  }, [navigation, fromCocktailFlow, returnTo, lastIngredientsTab]);

  useEffect(() => {
    if (!isFocused) return;

    const beforeRemoveSub = navigation.addListener("beforeRemove", (e) => {
      if (["NAVIGATE", "REPLACE"].includes(e.data.action.type)) return;
      e.preventDefault();
      if (fromCocktailFlow) {
        navigation.navigate("Cocktails", { screen: returnTo });
      } else {
        navigation.replace("IngredientsMain", { screen: lastIngredientsTab });
      }
    });

    const hwSub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fromCocktailFlow) {
        navigation.navigate("Cocktails", { screen: returnTo });
      } else {
        navigation.replace("IngredientsMain", { screen: lastIngredientsTab });
      }
      return true;
    });

    return () => {
      beforeRemoveSub();
      hwSub.remove();
    };
  }, [isFocused, navigation, fromCocktailFlow, returnTo, lastIngredientsTab]);

  /* ---------- Lifecycle ---------- */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      setName(initialNameParam);
    }
  }, [isFocused, initialNameParam]);

  useEffect(() => {
    if (!isFocused) return;
    loadAvailableTags();
  }, [isFocused, loadAvailableTags]);

  const loadBases = useCallback(async () => {
    if (basesLoaded || loadingBases) return;
    setLoadingBases(true);
    try {
      await InteractionManager.runAfterInteractions();
      const ingredients = await getAllIngredients();
      const baseOnly = ingredients
        .filter((i) => i.baseIngredientId == null)
        .sort((a, b) =>
          a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
        )
        .map((i) => ({
          id: i.id,
          name: i.name,
          photoUri: i.photoUri || null,
          nameLower: (i.name || "").toLowerCase(),
        }));
      if (!isMountedRef.current) return;
      setBaseOnlySorted(baseOnly);
      setBasesLoaded(true);
    } finally {
      if (isMountedRef.current) setLoadingBases(false);
    }
  }, [basesLoaded, loadingBases]);

  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => {
      if (!basesLoaded && !loadingBases) {
        loadBases().catch(() => {});
      }
    }, 500);
    return () => clearTimeout(t);
  }, [isFocused, basesLoaded, loadingBases, loadBases]);

  /* ---------- UI handlers ---------- */
  const toggleTagById = useCallback(
    (id) => {
      setTags((prev) => {
        const exists = prev.some((t) => t.id === id);
        if (exists) return prev.filter((t) => t.id !== id);
        const toAdd =
          availableTags.find((t) => t.id === id) ||
          BUILTIN_INGREDIENT_TAGS.find((t) => t.id === id);
        return toAdd ? [...prev, toAdd] : prev;
      });
    },
    [availableTags]
  );

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
    const trimmed = (name || "").trim();
    if (!trimmed) {
      Alert.alert("Validation", "Please enter a name for the ingredient.");
      return;
    }
    const newIng = {
      id: Date.now(),
      name: trimmed,
      description,
      photoUri,
      tags,
      baseIngredientId: baseIngredientId ?? null,
      createdAt: Date.now(),
    };

    await addIngredient(newIng);
    await refreshIngredientsData();

    if (fromCocktailFlow) {
      navigation.navigate("Cocktails", {
        screen: returnTo,
        params: {
          createdIngredient: {
            id: newIng.id,
            name: newIng.name,
            photoUri: newIng.photoUri || null,
            baseIngredientId: newIng.baseIngredientId ?? null,
            tags: newIng.tags || [],
          },
          targetLocalId,
        },
        merge: true,
      });
      return;
    }

    navigation.replace("IngredientsMain", { screen: lastIngredientsTab });
  }, [
    name,
    description,
    photoUri,
    tags,
    baseIngredientId,
    navigation,
    fromCocktailFlow,
    returnTo,
    targetLocalId,
    lastIngredientsTab,
  ]);

  const openMenu = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      setMenuAnchor({ x, y: y + h });
      setMenuVisible(true);
      loadBases();
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  }, [loadBases]);

  /* ---------- Render ---------- */
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
          Name
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
          Photo
        </Text>
        <Pressable
          style={[
            styles.imageButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          onPress={pickImage}
          android_ripple={RIPPLE}
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
        </Pressable>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Tags
        </Text>
        <View style={styles.tagContainer}>
          {tags.map((t) => (
            <TagPill
              key={t.id}
              id={t.id}
              name={t.name}
              color={t.color}
              onToggle={toggleTagById}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Add Tag
        </Text>
        <View style={styles.tagContainer}>
          {availableTags
            .filter((t) => !tags.some((x) => x.id === t.id))
            .map((t) => (
              <TagPill
                key={t.id}
                id={t.id}
                name={t.name}
                color={t.color}
                onToggle={toggleTagById}
              />
            ))}
          <Pressable
            onPress={openAddTagModal}
            style={[
              styles.addTagButton,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.addTagButtonText,
                { color: theme.colors.primary },
              ]}
            >
              +Add
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setTagsModalAutoAdd(false);
            setTagsModalVisible(true);
          }}
        >
          <Text style={[styles.manageTagsLink, { color: theme.colors.primary }]}>Manage tags</Text>
        </Pressable>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>Base Ingredient</Text>

        <View
          ref={anchorRef}
          collapsable={false}
          onLayout={(e) => setAnchorWidth(e.nativeEvent.layout.width)}
        >
          <Pressable
            onPress={openMenu}
            style={[
              styles.input,
              styles.anchorInput,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
            android_ripple={RIPPLE}
          >
            <View style={styles.anchorRow}>
              {selectedBase?.photoUri ? (
                <Image
                  source={{ uri: selectedBase.photoUri }}
                  style={styles.menuImg}
                />
              ) : selectedBase ? (
                <View style={[styles.menuImg, styles.menuImgPlaceholder]} />
              ) : null}
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
          </Pressable>
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
              data={[
                { id: "__none__", name: "None", nameLower: "none" },
                ...filteredBase,
              ]}
              keyExtractor={(item, i) => String(item.id ?? i)}
              renderItem={({ item }) =>
                item.id === "__none__" ? (
                  <Pressable
                    onPress={() => {
                      setBaseIngredientId(null);
                      setMenuVisible(false);
                    }}
                    android_ripple={RIPPLE}
                    style={({ pressed }) => [
                      styles.menuRow,
                      pressed && { opacity: 0.96 },
                    ]}
                  >
                    <View style={styles.menuRowInner}>
                      <PaperText>None</PaperText>
                    </View>
                  </Pressable>
                ) : (
                  <BaseRow
                    id={item.id}
                    name={item.name}
                    photoUri={item.photoUri}
                    onSelect={(id) => {
                      setBaseIngredientId(id);
                      setMenuVisible(false);
                    }}
                  />
                )
              }
              style={{
                height: Math.min(
                  300,
                  MENU_ROW_HEIGHT * (filteredBase.length + 1)
                ),
              }}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews
              initialNumToRender={10}
              getItemLayout={(_, index) => ({
                length: MENU_ROW_HEIGHT,
                offset: MENU_ROW_HEIGHT * index,
                index,
              })}
            />
          )}
        </Menu>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Description
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

        <Pressable
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          disabled={!name.trim()}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save Ingredient
          </Text>
        </Pressable>
      </ScrollView>
      <IngredientTagsModal
        visible={tagsModalVisible}
        onClose={closeTagsModal}
        autoAdd={tagsModalAutoAdd}
      />
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
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, aspectRatio: 1, resizeMode: "contain" },

  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: { color: "white", fontWeight: "bold" },

  addTagButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
  },
  addTagButtonText: { fontWeight: "500" },

  manageTagsLink: { marginTop: 8, marginBottom: 4, fontWeight: "500" },

  menuSearchBox: { paddingHorizontal: 12, paddingVertical: 8 },
  menuSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuRow: { paddingHorizontal: 12, paddingVertical: 8 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuImg: {
    width: 40,
    height: 40,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#fff",
    resizeMode: "contain",
  },
  menuImgPlaceholder: { backgroundColor: "#EAEAEA" },

  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
