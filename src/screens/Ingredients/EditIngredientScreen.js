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
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import { useTheme, Menu, Divider, Text as PaperText } from "react-native-paper";

import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import {
  saveIngredient,
  deleteIngredient,
  getIngredientById,
  getAllIngredients,
} from "../../storage/ingredientsStorage";
import { useTabMemory } from "../../context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";

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

// pills for tags (memo, стабільний onPress через id)
const TagPill = memo(function TagPill({ id, name, color, onToggle }) {
  const theme = useTheme();
  const ripple = { color: theme.colors.outlineVariant };
  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: color || theme.colors.disabled },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>
        {name}
      </Text>
    </Pressable>
  );
});

// row in base menu (memo, стабільний onPress через id)
const BaseRow = memo(function BaseRow({ id, name, photoUri, onSelect }) {
  const theme = useTheme();
  const ripple = { color: theme.colors.outlineVariant };
  return (
    <Pressable
      onPress={() => onSelect(id)}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { opacity: 0.9, transform: [{ scale: 0.997 }] },
      ]}
    >
      <View style={styles.menuRowInner}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[
              styles.menuImg,
              { backgroundColor: theme.colors.background },
            ]}
          />
        ) : (
          <View
            style={[
              styles.menuImg,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        )}
        <PaperText numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {name}
        </PaperText>
      </View>
    </Pressable>
  );
});

export default function EditIngredientScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");
  const currentId = route.params?.id;

  // entity + form state
  const [ingredient, setIngredient] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([]);

  // reference lists
  const [availableTags, setAvailableTags] = useState([]); // builtin + custom

  // base list (lazy) — кешуємо nameLower для швидкого фільтру
  const [baseOnlySorted, setBaseOnlySorted] = useState([]); // {id,name,photoUri,nameLower}
  const [basesLoaded, setBasesLoaded] = useState(false);
  const [loadingBases, setLoadingBases] = useState(false);

  // base link
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const selectedBase = useMemo(
    () => baseOnlySorted.find((i) => i.id === baseIngredientId),
    [baseOnlySorted, baseIngredientId]
  );

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  // search in base menu (debounced + deferred)
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filteredBase = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return baseOnlySorted;
    return baseOnlySorted.filter((i) => i.nameLower.includes(q));
  }, [baseOnlySorted, deferredQuery]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // завжди повертаємось на деталі поточного інгредієнта
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // видима кнопка Back у хедері
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons
            name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleGoBack, theme.colors.onSurface]);

  const skipPromptRef = useRef(false);
  const initialHashRef = useRef("{}");
  const [dirty, setDirty] = useState(false);

  const serialize = useCallback(
    () =>
      JSON.stringify({
        name: name.trim(),
        description,
        photoUri,
        tags,
        baseIngredientId,
      }),
    [name, description, photoUri, tags, baseIngredientId]
  );

  useEffect(() => {
    if (ingredient) initialHashRef.current = serialize();
  }, [ingredient, serialize]);

  useEffect(() => {
    setDirty(serialize() !== initialHashRef.current);
  }, [serialize]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (skipPromptRef.current || !dirty) return;
      e.preventDefault();
      Alert.alert("Save changes?", "Do you want to save changes?", [
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            skipPromptRef.current = true;
            navigation.dispatch(e.data.action);
          },
        },
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            skipPromptRef.current = true;
            await handleSave(true);
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsub;
  }, [navigation, dirty, handleSave]);

  // load tags + entity on focus (паралельно)
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    (async () => {
      try {
        const [customTags, data] = await Promise.all([
          getAllTags(),
          getIngredientById(currentId),
        ]);
        if (cancelled || !isMountedRef.current) return;

        setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...(customTags || [])]);

        if (data) {
          setIngredient(data);
          setName(data.name || "");
          setDescription(data.description || "");
          setPhotoUri(data.photoUri || null);
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setBaseIngredientId(data.baseIngredientId ?? null);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [isFocused, currentId]);

  // lazy-load bases (exclude current ingredient)
  const loadBases = useCallback(async () => {
    if (basesLoaded || loadingBases) return;
    setLoadingBases(true);
    try {
      await InteractionManager.runAfterInteractions();
      const ingredients = await getAllIngredients();
      const baseOnly = ingredients
        .filter((i) => i.baseIngredientId == null && i.id !== currentId)
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
  }, [basesLoaded, loadingBases, currentId]);

  // префетч баз
  useEffect(() => {
    if (!isFocused) return;
    const t = setTimeout(() => {
      if (!basesLoaded && !loadingBases) loadBases().catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [isFocused, basesLoaded, loadingBases, loadBases]);

  // toggleTag через id
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

  const handleSave = useCallback(
    async (stay = false) => {
      const trimmed = name.trim();
      if (!trimmed) {
        Alert.alert("Please enter a name for the ingredient.");
        return;
      }
      if (!ingredient) return;

      const updated = {
        ...ingredient,
        name: trimmed,
        description,
        photoUri,
        tags,
        baseIngredientId: baseIngredientId ?? null,
      };
      await saveIngredient(updated);
      initialHashRef.current = serialize();
      setDirty(false);
      if (!stay) {
        skipPromptRef.current = true;
        navigation.navigate("IngredientDetails", { id: updated.id });
      }
      return updated;
    },
    [
      ingredient,
      name,
      description,
      photoUri,
      tags,
      baseIngredientId,
      navigation,
      serialize,
    ]
  );

  const handleDelete = useCallback(() => {
    if (!ingredient) return;
    Alert.alert("Delete", "Delete this ingredient?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteIngredient(ingredient.id);
          if (previousTab) navigation.navigate(previousTab);
          else navigation.goBack();
        },
      },
    ]);
  }, [ingredient, navigation, previousTab]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleDelete}
          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Delete ingredient"
        >
          <MaterialIcons
            name="delete"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleDelete, theme.colors.onSurface]);

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

  if (!ingredient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const ripple = { color: theme.colors.outlineVariant };

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
        <Pressable
          style={[
            styles.imageButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
          onPress={pickImage}
          android_ripple={ripple}
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
          Tags:
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
          Add Tag:
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
            android_ripple={ripple}
          >
            <View style={styles.anchorRow}>
              {selectedBase?.photoUri && (
                <Image
                  source={{ uri: selectedBase.photoUri }}
                  style={[
                    styles.menuImg,
                    { backgroundColor: theme.colors.background },
                  ]}
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
              <ActivityIndicator color={theme.colors.primary} />
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
                    android_ripple={ripple}
                    style={({ pressed }) => [
                      styles.menuRow,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={styles.menuRowInner}>
                      <PaperText style={{ color: theme.colors.onSurface }}>
                        None
                      </PaperText>
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
          Description:
        </Text>
        <TextInput
          placeholder="Optional description"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={description}
          onChangeText={setDescription}
          style={[
            styles.input,
            styles.multiline,
            {
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
          android_ripple={{ color: theme.colors.onPrimaryContainer }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save changes
          </Text>
        </Pressable>
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

  multiline: { minHeight: 80, textAlignVertical: "top" },

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
  tagText: { fontWeight: "bold" },

  menuSearchBox: { paddingHorizontal: 12, paddingVertical: 8 },
  menuSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuRow: { paddingHorizontal: 12, paddingVertical: 8 },
  menuRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuImg: { width: 40, height: 40, borderRadius: 8 },

  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
