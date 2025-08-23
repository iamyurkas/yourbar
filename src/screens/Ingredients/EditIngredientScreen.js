// src/screens/Ingredients/EditIngredientScreen.js
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
  Platform,
  InteractionManager,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  BackHandler,
  Dimensions,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { resizeImage } from "../../utils/images";
import {
  useNavigation,
  useRoute,
  useIsFocused,
  CommonActions,
} from "@react-navigation/native";
import { useTheme, Menu, Divider, Text as PaperText } from "react-native-paper";
import { useHeaderHeight } from "@react-navigation/elements";

import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import {
  deleteIngredient,
  updateIngredientById,
  saveAllIngredients,
} from "../../storage/ingredientsStorage";
import { MaterialIcons } from "@expo/vector-icons";
import IngredientTagsModal from "../../components/IngredientTagsModal";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import useIngredientsData from "../../hooks/useIngredientsData";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { WORD_SPLIT_RE, wordPrefixMatch } from "../../utils/wordPrefixMatch";

// ----------- helpers -----------
const useDebounced = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

const IMAGE_SIZE = 150;
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
  const headerHeight = useHeaderHeight();
  const {
    setIngredients: setGlobalIngredients,
    baseIngredients = [],
  } = useIngredientsData();
  const { setUsageMap, ingredientsById } = useIngredientUsage();
  const currentId = route.params?.id;

  // entity + form state
  const [ingredient, setIngredient] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([]);
  const selectedTagIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  // reference lists
  const [availableTags, setAvailableTags] = useState([]); // builtin + custom
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

  // base link
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const baseList = useMemo(
    () => baseIngredients.filter((i) => i.id !== currentId),
    [baseIngredients, currentId]
  );
  const selectedBase = useMemo(
    () => baseList.find((i) => i.id === baseIngredientId),
    [baseList, baseIngredientId]
  );

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null); // { x, y }
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  // scrolling helpers
  const scrollRef = useRef(null);
  const viewportRef = useRef(null);
  const descRef = useRef(null);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", (e) =>
      setKbHeight(e?.endCoordinates?.height || 0)
    );
    const hd = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  const requestScrollIntoView = useCallback(
    (nodeRef) => {
      if (!nodeRef?.current || !scrollRef.current) return;
      if (contentH <= viewportH) return;

      const viewportHeight =
        viewportH || Dimensions.get("window").height;
      const visibleHeight = viewportHeight - kbHeight;
      const targetCenter = visibleHeight / 2;
      const DEAD = 10;
      const EXTRA_SCROLL = 10; // scroll a bit higher when moving up

      const tryOnce = () => {
        if (!nodeRef?.current) return;
        nodeRef.current.measureInWindow((ix, iy, iw, ih) => {
          const inputCenter = iy + ih / 2;
          const delta = inputCenter - targetCenter;
          if (delta > DEAD || kbHeight === 0) {
            const maxY = Math.max(0, contentH - viewportH);
            const targetY = Math.min(scrollY + delta + DEAD, maxY);
            if (targetY > scrollY) {
              const adjustedY = Math.min(targetY + EXTRA_SCROLL, maxY);
              scrollRef.current.scrollTo({ y: adjustedY, animated: true });
            }
          }
        });
      };

      tryOnce();
      setTimeout(tryOnce, 80);
    },
    [viewportH, kbHeight, contentH, scrollY]
  );

  // search in base menu (debounced + deferred)
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filteredBase = useMemo(() => {
    const tokens = normalizeSearch(deferredQuery)
      .split(WORD_SPLIT_RE)
      .filter(Boolean);
    if (tokens.length === 0) return baseList;
    return baseList.filter((i) =>
      wordPrefixMatch(i.searchTokens || [], tokens)
    );
  }, [baseList, deferredQuery]);

  // --- dirty tracking (як в EditCocktailScreen) ---
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const initialHashRef = useRef("{}");
  const skipPromptRef = useRef(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // serialize для порівняння стану
  const serialize = useCallback(
    () =>
      JSON.stringify({
        name,
        description,
        photoUri,
        tags,
        baseIngredientId,
      }),
    [name, description, photoUri, tags, baseIngredientId]
  );

  // видима кнопка Back у хедері
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDelete = useCallback(() => {
    if (!ingredient) return;
    setConfirmDelete(true);
  }, [ingredient]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
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
      headerRight: () => (
        <Pressable
          onPress={handleDelete}
          android_ripple={{ color: theme.colors.outlineVariant, borderless: true }}
          style={({ pressed }) => ({
            paddingHorizontal: 8,
            paddingVertical: 4,
            opacity: pressed ? 0.5 : 1,
            borderRadius: 8,
          })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Delete ingredient"
        >
          <MaterialIcons name="delete" size={24} color={theme.colors.onSurface} />
        </Pressable>
      ),
      gestureEnabled: false,
    });
  }, [navigation, handleBackPress, theme.colors.onSurface, handleDelete]);

  useEffect(() => {
    const hw = BackHandler.addEventListener("hardwareBackPress", () => {
      navigation.goBack();
      return true;
    });
    return () => hw.remove();
  }, [navigation]);

  // load tags + entity on focus (паралельно)
  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    (async () => {
      try {
        await loadAvailableTags();
        if (cancelled || !isMountedRef.current) return;
        const data = ingredientsById[currentId];
        if (data) {
          setIngredient(data);
          setName(data.name || "");
          setDescription(data.description || "");
          setPhotoUri(data.photoUri || null);
          setTags(Array.isArray(data.tags) ? data.tags : []);
          setBaseIngredientId(data.baseIngredientId ?? null);

          // зафіксувати початковий хеш після того, як стани розкладуться
          requestAnimationFrame(() => {
            initialHashRef.current = JSON.stringify({
              name: data.name || "",
              description: data.description || "",
              photoUri: data.photoUri || null,
              tags: Array.isArray(data.tags) ? data.tags : [],
              baseIngredientId: data.baseIngredientId ?? null,
            });
            setDirty(false);
          });
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [isFocused, currentId, loadAvailableTags, ingredientsById]);


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
    if (!result.canceled) {
      const resized = await resizeImage(result.assets[0].uri);
      setPhotoUri(resized);
    }
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
      // оптимістично оновити глобальний список і зберегти оновлені дані
      setGlobalIngredients((list) => {
        const searchName = normalizeSearch(updated.name);
        const searchTokens = searchName.split(WORD_SPLIT_RE).filter(Boolean);
        const next = updateIngredientById(list, {
          ...updated,
          searchName,
          searchTokens,
        }).sort((a, b) =>
          a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
        );
        saveAllIngredients(next).catch(() => {});
        return next;
      });

      // зберегти локально baseline і зняти dirty
      initialHashRef.current = serialize();
      setDirty(false);

      if (!stay) {
        skipPromptRef.current = true;
        const detailParams = {
          id: updated.id,
          initialIngredient: updated,
        };
        if (route.params?.returnTo) {
          detailParams.returnTo = route.params.returnTo;
          detailParams.createdIngredient = {
            id: updated.id,
            name: updated.name,
            photoUri: updated.photoUri || null,
            baseIngredientId: updated.baseIngredientId ?? null,
            tags: updated.tags || [],
          };
          detailParams.targetLocalId = route.params.targetLocalId;
        }
        navigation.dispatch((state) => {
          const routes = state.routes.filter((r) => r.name !== "IngredientDetails");
          routes[routes.length - 1] = {
            name: "IngredientDetails",
            params: detailParams,
          };
          return CommonActions.reset({
            ...state,
            routes,
            index: routes.length - 1,
          });
        });
      } else {
        setIngredient(updated);
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
      route.params?.returnTo,
      route.params?.targetLocalId,
      serialize,
      setGlobalIngredients,
      saveAllIngredients,
    ]
  );

  const openMenu = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      setMenuAnchor({ x, y: headerHeight });
      setMenuVisible(true);
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  }, [headerHeight]);

  // позначати dirty при будь-якій зміні полів (після ініціалізації)
  useEffect(() => {
    if (!ingredient) return;
    const current = serialize();
    setDirty(current !== initialHashRef.current);
  }, [serialize, ingredient]);

  // глобальне перехоплення виходу (будь-який navigate/back/gesture)
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (skipPromptRef.current || !dirty) return;
      e.preventDefault();
      setPendingNav(e.data.action);
    });
    return unsub;
  }, [navigation, dirty]);

  if (!ingredient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const ripple = { color: theme.colors.outlineVariant };

  return (
    <>
      <View
        ref={viewportRef}
        collapsable={false}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.container, { paddingBottom: 60 + kbHeight }]}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, h) => setContentH(h)}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          scrollIndicatorInsets={{ bottom: kbHeight }}
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
            .filter((t) => !selectedTagIds.has(t.id))
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
                {selectedBase ? selectedBase.name : "None"}
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

          <View
            style={{
              maxHeight: Math.min(
                300,
                MENU_ROW_HEIGHT * (filteredBase.length + 1)
              ),
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
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

              {filteredBase.map((item) => (
                <BaseRow
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  photoUri={item.photoUri}
                  onSelect={(id) => {
                    setBaseIngredientId(id);
                    setMenuVisible(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </Menu>

        <Text style={[styles.label, { color: theme.colors.onBackground }]}>
          Description:
        </Text>
        <TextInput
          ref={descRef}
          collapsable={false}
          onFocus={() => requestScrollIntoView(descRef)}
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
          onPress={() => handleSave(false)}
          android_ripple={{ color: theme.colors.onPrimary }}
          disabled={!name.trim()}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save Changes
          </Text>
        </Pressable>

      </ScrollView>
    </View>
      <IngredientTagsModal
        visible={tagsModalVisible}
        onClose={closeTagsModal}
        autoAdd={tagsModalAutoAdd}
      />
      <ConfirmationDialog
        visible={confirmDelete}
        title="Delete Ingredient"
        message="Are you sure?"
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!ingredient) return;
          skipPromptRef.current = true;
          let updatedList;
          setGlobalIngredients((list) => {
            updatedList = deleteIngredient(list, ingredient.id);
            return updatedList;
          });
          setUsageMap((prev) => {
            const next = { ...prev };
            delete next[ingredient.id];
            return next;
          });
          await saveAllIngredients(updatedList);
          navigation.popToTop();
          setConfirmDelete(false);
        }}
      />
      <ConfirmationDialog
        visible={!!pendingNav}
        title="Save changes?"
        message="Do you want to save changes?"
        actions={[
          {
            label: "Discard",
            mode: "outlined",
            onPress: () => {
              skipPromptRef.current = true;
              navigation.dispatch(pendingNav);
              setPendingNav(null);
            },
          },
          {
            label: "Cancel",
            mode: "outlined",
            onPress: () => setPendingNav(null),
          },
          {
            label: "Save",
            mode: "contained",
            onPress: async () => {
              skipPromptRef.current = true;
              const updated = await handleSave(true);
              navigation.dispatch((state) => {
                const routes = [...state.routes];
                const prevIndex = routes.length - 2;
                if (prevIndex >= 0) {
                  routes[prevIndex] = {
                    ...routes[prevIndex],
                    params: {
                      ...routes[prevIndex].params,
                      id: updated.id,
                      initialIngredient: updated,
                    },
                  };
                }
                return CommonActions.reset({
                  ...state,
                  routes,
                  index: state.index,
                });
              });
              navigation.dispatch(pendingNav);
              setPendingNav(null);
            },
          },
        ]}
        onCancel={() => setPendingNav(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  label: { fontWeight: "bold", marginTop: 16 },
  input: { borderWidth: 1, padding: 10, marginTop: 8, borderRadius: 8 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
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
  tagText: { fontWeight: "bold" },
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
  menuImg: { width: 40, height: 40, aspectRatio: 1, borderRadius: 8, resizeMode: "contain" },

  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
