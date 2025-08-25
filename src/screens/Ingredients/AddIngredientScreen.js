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
  FlatList,
  Alert,
  InteractionManager,
  Pressable,
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
  StackActions,
} from "@react-navigation/native";
import { useTheme, Menu, Divider, Text as PaperText } from "react-native-paper";
import { HeaderBackButton, useHeaderHeight } from "@react-navigation/elements";

import { getAllTags } from "../../storage/ingredientTagsStorage";
import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import { TAG_COLORS } from "../../theme";
import { addIngredient } from "../../storage/ingredientsStorage";
import { useTabMemory } from "../../context/TabMemoryContext";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import IngredientTagsModal from "../../components/IngredientTagsModal";
import useIngredientsData from "../../hooks/useIngredientsData";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { WORD_SPLIT_RE, wordPrefixMatch } from "../../utils/wordPrefixMatch";



/* ---------------- helpers ---------------- */
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
const MENU_TOP_OFFSET = 150;

const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 9)) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex.length === 7 ? `${hex}${a}` : `${hex.slice(0, 7)}${a}`;
};

/* -------------- pills for tags (memo) -------------- */
const TagPill = memo(function TagPill({ id, name, color, onToggle }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={{ color: withAlpha(theme.colors.primary, 0.1) }}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: color || theme.colors.surfaceVariant },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{name}</Text>
    </Pressable>
  );
});

/* -------------- row in base menu (memo) -------------- */
const BaseRow = memo(function BaseRow({ id, name, photoUri, onSelect }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(id)}
      android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { opacity: 0.96, transform: [{ scale: 0.997 }] },
      ]}
    >
      <View style={styles.menuRowInner}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.menuImg, { backgroundColor: theme.colors.background }]}
          />
        ) : (
          <View
            style={[styles.menuImg, { backgroundColor: theme.colors.surfaceVariant }]}
          />
        )}
        <PaperText numberOfLines={1}>{name}</PaperText>
      </View>
    </Pressable>
  );
});

export default function AddIngredientScreen() {
  const theme = useTheme();
  const RIPPLE = { color: withAlpha(theme.colors.onSurface, 0.12) };
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const headerHeight = useHeaderHeight();
  const { getTab } = useTabMemory();
  const {
    ingredients: globalIngredients = [],
    setIngredients: setGlobalIngredients,
    baseIngredients = [],
  } = useIngredientsData();
  const { setUsageMap } = useIngredientUsage();

  const collator = useMemo(
    () => new Intl.Collator("uk", { sensitivity: "base" }),
    []
  );

  // read incoming params
  const initialNameParam = route.params?.initialName;
  const targetLocalId = route.params?.targetLocalId;
  const returnTo = route.params?.returnTo || "AddCocktail";
  const fromCocktailFlow = targetLocalId != null;
  const lastIngredientsTab =
    (typeof getTab === "function" && getTab("ingredients")) || "All";

  // form state
  const [name, setName] = useState(initialNameParam || "");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState(() => {
    const other = BUILTIN_INGREDIENT_TAGS.find((t) => t.id === 10);
    return other ? [other] : [{ id: 10, name: "other", color: TAG_COLORS[15] }];
  });

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

  // base ingredient link
  const [baseIngredientId, setBaseIngredientId] = useState(null);
  const selectedBase = useMemo(
    () => baseIngredients.find((i) => i.id === baseIngredientId),
    [baseIngredients, baseIngredientId]
  );

  // search in base menu
  const [baseIngredientSearch, setBaseIngredientSearch] = useState("");
  const debouncedQuery = useDebounced(baseIngredientSearch, 250);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filteredBase = useMemo(() => {
    const tokens = normalizeSearch(deferredQuery)
      .split(WORD_SPLIT_RE)
      .filter(Boolean);
    if (tokens.length === 0) return baseIngredients;
    return baseIngredients.filter((i) =>
      wordPrefixMatch(i.searchTokens || [], tokens)
    );
    // Note: baseIngredients already sorted
  }, [baseIngredients, deferredQuery]);

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
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
    if (!isFocused || initialNameParam === undefined) return;

    setName(initialNameParam);
    setDescription("");
    setPhotoUri(null);
    setTags(() => {
      const other = BUILTIN_INGREDIENT_TAGS.find((t) => t.id === 10);
      return other
        ? [other]
        : [{ id: 10, name: "other", color: TAG_COLORS[15] }];
    });
    setBaseIngredientId(null);
    setBaseIngredientSearch("");
    navigation.setParams({ initialName: undefined });
  }, [isFocused, initialNameParam, navigation]);

  useEffect(() => {
    if (!isFocused) return;
    loadAvailableTags();
  }, [isFocused, loadAvailableTags]);

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
    if (!result.canceled) {
      const resized = await resizeImage(result.assets[0].uri);
      setPhotoUri(resized);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      Alert.alert("Validation", "Please enter a name for the ingredient.");
      return;
    }

    const searchName = normalizeSearch(trimmed);
    const saved = {
      id: Date.now(),
      name: trimmed,
      description,
      photoUri,
      tags,
      baseIngredientId: baseIngredientId ?? null,
      usageCount: 0,
      singleCocktailName: null,
      searchName,
      searchTokens: searchName.split(WORD_SPLIT_RE).filter(Boolean),
      inBar: false,
      inShoppingList: false,
    };

    const detailParams = { id: saved.id, initialIngredient: saved };
    if (fromCocktailFlow) {
      navigation.navigate("Cocktails", {
        screen: returnTo,
        params: {
          createdIngredient: detailParams.initialIngredient,
          targetLocalId,
        },
        merge: true,
      });
    } else {
      navigation.dispatch(StackActions.replace("IngredientDetails", detailParams));
    }

    // Persist the ingredient without blocking navigation.
    InteractionManager.runAfterInteractions(() => {
      addIngredient(saved).catch(() => {});

      setGlobalIngredients((map) => {
        const arr = Array.from(map.values()).filter((i) => i.id !== saved.id);
        const idx = arr.findIndex(
          (i) => collator.compare(i.name, saved.name) > 0
        );
        if (idx === -1) arr.push(saved);
        else arr.splice(idx, 0, saved);
        return new Map(arr.map((i) => [i.id, i]));
      });
      setUsageMap((prev) => ({ ...prev, [saved.id]: [] }));
    });
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
    addIngredient,
    setGlobalIngredients,
    setUsageMap,
    collator,
  ]);

  const openMenu = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      const top = Math.max(0, headerHeight - MENU_TOP_OFFSET);
      setMenuAnchor({ x, y: top });
      setMenuVisible(true);
      requestAnimationFrame(() =>
        setTimeout(() => searchInputRef.current?.focus(), 0)
      );
    });
  }, [headerHeight]);

  /* ---------- Render ---------- */
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
                <View
                  style={[styles.menuImg, { backgroundColor: theme.colors.surfaceVariant }]}
                />
              ) : null}
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
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredBase}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={
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
              }
              renderItem={({ item }) => (
                <BaseRow
                  id={item.id}
                  name={item.name}
                  photoUri={item.photoUri}
                  onSelect={(id) => {
                    setBaseIngredientId(id);
                    setMenuVisible(false);
                  }}
                />
              )}
            />
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
          style={[
            styles.saveButton,
            {
              backgroundColor: name.trim()
                ? theme.colors.primary
                : theme.colors.disabled,
            },
          ]}
          onPress={handleSave}
          android_ripple={{ color: withAlpha(theme.colors.onPrimary, 0.15) }}
          disabled={!name.trim()}
        >
          <Text
            style={{
              color: name.trim()
                ? theme.colors.onPrimary
                : theme.colors.onSurface,
              fontWeight: "bold",
            }}
          >
            Save Ingredient
          </Text>
        </Pressable>
      </ScrollView>
    </View>
      <IngredientTagsModal
        visible={tagsModalVisible}
        onClose={closeTagsModal}
        autoAdd={tagsModalAutoAdd}
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
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    aspectRatio: 1,
    resizeMode: "contain",
    backgroundColor: "#fff",
  },

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
  menuImg: {
    width: 40,
    height: 40,
    aspectRatio: 1,
    borderRadius: 8,
    resizeMode: "contain",
  },

  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});
