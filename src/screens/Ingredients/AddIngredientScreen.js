// src/screens/Ingredients/AddIngredientScreen.js
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
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
  InteractionManager,
  ActivityIndicator,
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

import { BUILTIN_INGREDIENT_TAGS } from "../../constants/ingredientTags";
import { TAG_COLORS } from "../../theme";
import { addIngredient } from "../../storage/ingredientsStorage";
import { useTabMemory } from "../../context/TabMemoryContext";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import IngredientTagsModal from "../../components/IngredientTagsModal";
import TagPill from "../../components/TagPill";
import IngredientBaseRow, {
  INGREDIENT_BASE_ROW_HEIGHT,
} from "../../components/IngredientBaseRow";
import useIngredientsData from "../../hooks/useIngredientsData";
import useIngredientTags from "../../hooks/useIngredientTags";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../../utils/wordPrefixMatch";
import useInfoDialog from "../../hooks/useInfoDialog";
import useBaseIngredientPicker from "../../hooks/useBaseIngredientPicker";
import { withAlpha } from "../../utils/color";

const IMAGE_SIZE = 150;
const MENU_TOP_OFFSET = 70;

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
  const [showInfo, infoDialog] = useInfoDialog();

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
  const [saving, setSaving] = useState(false);

  // tag helpers & modal state
  const {
    availableTags,
    tagsModalVisible,
    tagsModalAutoAdd,
    setTagsModalVisible,
    setTagsModalAutoAdd,
    loadAvailableTags,
    openAddTagModal,
    closeTagsModal,
  } = useIngredientTags();

  // base ingredient picker
  const {
    baseIngredientId,
    setBaseIngredientId,
    baseIngredientSearch,
    setBaseIngredientSearch,
    filteredBase,
    selectedBase,
  } = useBaseIngredientPicker(baseIngredients);

  // anchored menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [anchorWidth, setAnchorWidth] = useState(0);
  const anchorRef = useRef(null);
  const searchInputRef = useRef(null);

  // scrolling helpers
  const scrollRef = useRef(null);
  const viewportRef = useRef(null);
  const nameRef = useRef(null);
  const descRef = useRef(null);
  const focusedInputRef = useRef(null);
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", (e) => {
      const h = e?.endCoordinates?.height || 0;
      console.log('[AddIngredientScreen][kb] didShow height', h, 'viewportH', viewportH, 'contentH', contentH, 'scrollY', scrollY);
      setKbHeight(h);
      const target = focusedInputRef.current;
      if (target) {
        console.log('[AddIngredientScreen][kb] scroll target set');
        requestAnimationFrame(() => requestScrollIntoView(target));
        setTimeout(() => requestScrollIntoView(target), 80);
        setTimeout(() => requestScrollIntoView(target), 180);
      }
    });
    const hd = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, [requestScrollIntoView]);

  const requestScrollIntoView = useCallback(
    (nodeRef) => {
      if (!nodeRef?.current || !scrollRef.current) return;
      if (contentH <= viewportH) return;

      const MARGIN = 50; // ensure extra 50px visible above keyboard

      const tryOnce = () => {
        if (!nodeRef?.current || !viewportRef.current) return;
        viewportRef.current.measureInWindow((vx, vy) => {
          const visibleBottom = vy + viewportH - kbHeight - MARGIN;
          nodeRef.current.measureInWindow((ix, iy, iw, ih) => {
            const bottom = iy + ih;
            const overshoot = bottom - visibleBottom;
            if (overshoot > 0) {
              const maxY = Math.max(0, contentH - viewportH);
              const targetY = Math.min(scrollY + overshoot, maxY);
              if (targetY > scrollY) {
                scrollRef.current.scrollTo({ y: targetY, animated: true });
              }
            }
          });
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

  const didLoadTagsRef = useRef(false);
  useEffect(() => {
    if (!isFocused) return;
    if (didLoadTagsRef.current) {
      // Refresh available tags when returning to this screen.
      loadAvailableTags();
    } else {
      // Skip the first run – the hook loads tags on mount.
      didLoadTagsRef.current = true;
    }
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
      showInfo("Permission required", "Allow access to media library");
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
    if (saving) return;
    const trimmed = (name || "").trim();
    if (!trimmed) {
      showInfo("Validation", "Please enter a name for the ingredient.");
      return;
    }
    setSaving(true);

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

    InteractionManager.runAfterInteractions(() => {
      addIngredient(saved).catch(() => {});
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
    saving,
  ]);

  const openMenu = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setAnchorWidth(w);
      const top = MENU_TOP_OFFSET;
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
        <Text style={[styles.label, { color: theme.colors.onBackground, marginTop: -4 }]}>
          Name:
        </Text>
        <TextInput
          ref={nameRef}
          collapsable={false}
          onFocus={() => {
            focusedInputRef.current = nameRef;
            requestScrollIntoView(nameRef);
          }}
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
                margin: 8,
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
                INGREDIENT_BASE_ROW_HEIGHT * (filteredBase.length + 1)
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
                    { paddingHorizontal: 12, paddingVertical: 8 },
                    pressed && { opacity: 0.96 },
                  ]}
                >
                  <View
                    style={{
                      minHeight: 40,
                      justifyContent: "center",
                      paddingHorizontal: 12,
                    }}
                  >
                    <PaperText>None</PaperText>
                  </View>
                </Pressable>
              }
              renderItem={({ item }) => (
                <IngredientBaseRow
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
          onFocus={() => {
            focusedInputRef.current = descRef;
            requestScrollIntoView(descRef);
          }}
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
              backgroundColor: theme.colors.primary,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          android_ripple={{ color: withAlpha(theme.colors.onPrimary, 0.15) }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            Save Ingredient
          </Text>
          {saving && (
            <ActivityIndicator
              size="small"
              color={theme.colors.onPrimary}
              style={{ marginLeft: 8 }}
            />
          )}
        </Pressable>
      </ScrollView>
    </View>
      <IngredientTagsModal
        visible={tagsModalVisible}
        onClose={closeTagsModal}
        autoAdd={tagsModalAutoAdd}
      />
      {infoDialog}
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
  },
});
