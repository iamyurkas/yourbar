// src/screens/cocktails/AddCocktailScreen.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  FlatList,
  Dimensions,
  Keyboard,
  BackHandler,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { resizeImage } from "../../utils/images";
import { normalizeSearch } from "../../utils/normalizeSearch";
import { WORD_SPLIT_RE, wordPrefixMatch } from "../../utils/wordPrefixMatch";
import { withAlpha } from "../../utils/color";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import { useTheme, Portal, Modal } from "react-native-paper";
import { TAG_COLORS } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { HeaderBackButton, useHeaderHeight } from "@react-navigation/elements";
import { useTabMemory } from "../../context/TabMemoryContext";
import useInfoDialog from "../../hooks/useInfoDialog";
import useDebounced from "../../hooks/useDebounced";

import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
  renderers,
} from "react-native-popup-menu";
const { Popover } = renderers;
import { addCocktail } from "../../storage/cocktailsStorage";
import { BUILTIN_COCKTAIL_TAGS } from "../../constants/cocktailTags";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import { UNIT_ID, getUnitById, formatUnit } from "../../constants/measureUnits";
import { GLASSWARE, getGlassById } from "../../constants/glassware";

import CocktailTagsModal from "../../components/CocktailTagsModal";
import TagPill from "../../components/TagPill";
import TinyDivider from "../../components/TinyDivider";
import CocktailIngredientRow from "../../components/CocktailIngredientRow";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import useIngredientsData from "../../hooks/useIngredientsData";
import {
  addCocktailToUsageMap,
  applyUsageMapToIngredients,
} from "../../utils/ingredientUsage";
import { getAllowSubstitutes } from "../../storage/settingsStorage";

/* ---------- GlasswareMenu через popup-menu (Popover) ---------- */
const GlassPopover = memo(function GlassPopover({ selectedGlass, onSelect }) {
  const theme = useTheme();

  return (
    <Menu
      renderer={Popover}
      rendererProps={{
        placement: "bottom",
        preferredPlacement: "bottom",
        showArrow: false,
      }}
    >
      <MenuTrigger
        onPress={Keyboard.dismiss}
        customStyles={{
          TriggerTouchableComponent: Pressable,
          triggerTouchable: {},
        }}
      >
        <View
          style={[
            styles.mediaSquare,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          {selectedGlass?.image ? (
            <Image
              source={selectedGlass.image}
              style={styles.mediaImg}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 6,
              }}
            >
              <Text
                style={{ color: theme.colors.onSurface, fontWeight: "600" }}
                numberOfLines={2}
              >
                {selectedGlass?.name || "Cocktail glass"}
              </Text>
            </View>
          )}
        </View>
      </MenuTrigger>

      <MenuOptions
        customStyles={{
          optionsContainer: {
            width: 200,
            maxHeight: 360,
            backgroundColor: theme.colors.surface,
            padding: 0,
            borderRadius: 8,
            marginLeft: 18,
            marginTop: -6,
            overflow: "hidden",
          },
        }}
      >
        <FlatList
          data={GLASSWARE}
          keyExtractor={(g) => g.id}
          renderItem={({ item, index }) => (
            <View>
              {index > 0 ? (
                <TinyDivider color={theme.colors.outlineVariant} />
              ) : null}
              <MenuOption
                closeOnSelect
                onSelect={() => onSelect(item)}
                customStyles={{ optionWrapper: { padding: 0 } }}
              >
                <View
                  style={{
                    height: 56,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {item.image ? (
                    <Image
                      source={item.image}
                      style={{ width: 32, height: 32, marginRight: 10 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        marginRight: 10,
                        backgroundColor: theme.colors.outlineVariant,
                        borderRadius: 6,
                      }}
                    />
                  )}
                  <Text style={{ color: theme.colors.onSurface, flex: 1 }}>
                    {item.name}
                  </Text>
                </View>
              </MenuOption>
            </View>
          )}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, i) => ({
            length: 56,
            offset: 56 * i,
            index: i,
          })}
        />
      </MenuOptions>
    </Menu>
  );
});

/* ---------- Screen ---------- */
export default function AddCocktailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { getTab } = useTabMemory();
  const { cocktails, setCocktails, usageMap, setUsageMap } =
    useIngredientUsage();
  const { ingredients: globalIngredients = [], setIngredients } =
    useIngredientsData();
  const initialIngredient = route.params?.initialIngredient;
  const fromIngredientFlow = initialIngredient != null;
  const lastCocktailsTab =
    (typeof getTab === "function" && getTab("cocktails")) || "All";
  const headerHeight = useHeaderHeight();
  const subSearchRef = useRef(null);
  const [showInfo, infoDialog] = useInfoDialog();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: (props) => (
        <HeaderBackButton
          {...props}
          onPress={() => {
            if (fromIngredientFlow) {
              navigation.navigate("Ingredients", {
                screen: "IngredientDetails",
                params: { id: initialIngredient?.id },
              });
            } else {
              navigation.replace("CocktailsMain", { screen: lastCocktailsTab });
            }
          }}
          labelVisible={false}
        />
      ),
    });
  }, [navigation, fromIngredientFlow, initialIngredient?.id, lastCocktailsTab]);

  useEffect(() => {
    if (!isFocused) return;

    const beforeRemoveSub = navigation.addListener("beforeRemove", (e) => {
      if (["NAVIGATE", "REPLACE"].includes(e.data.action.type)) return;
      e.preventDefault();
      if (fromIngredientFlow) {
        navigation.navigate("Ingredients", {
          screen: "IngredientDetails",
          params: { id: initialIngredient?.id },
        });
      } else {
        navigation.replace("CocktailsMain", { screen: lastCocktailsTab });
      }
    });

    const hwSub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fromIngredientFlow) {
        navigation.navigate("Ingredients", {
          screen: "IngredientDetails",
          params: { id: initialIngredient?.id },
        });
      } else {
        navigation.replace("CocktailsMain", { screen: lastCocktailsTab });
      }
      return true;
    });

    return () => {
      beforeRemoveSub();
      hwSub.remove();
    };
  }, [
    isFocused,
    navigation,
    fromIngredientFlow,
    initialIngredient?.id,
    lastCocktailsTab,
  ]);

  // base fields
  const defaultTags = useMemo(() => {
    const custom = BUILTIN_COCKTAIL_TAGS.find((t) => t.id === 11);
    return custom ? [custom] : [{ id: 11, name: "custom", color: TAG_COLORS[15] }];
  }, []);

  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState(defaultTags);
  const [availableTags, setAvailableTags] = useState(BUILTIN_COCKTAIL_TAGS);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [tagsModalAutoAdd, setTagsModalAutoAdd] = useState(false);

  const loadAvailableTags = useCallback(async () => {
    const all = await getAllCocktailTags();
    setAvailableTags(Array.isArray(all) ? all : BUILTIN_COCKTAIL_TAGS);
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

  useEffect(() => {
    loadAvailableTags();
  }, [loadAvailableTags]);

  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const [glassId, setGlassId] = useState("cocktail_glass");

  const createBaseRow = (ing) => ({
    localId: Date.now(),
    name: ing?.name || "",
    selectedId: ing?.id ?? null,
    selectedItem: ing ?? null,
    quantity: "",
    unitId: UNIT_ID.ML,
    garnish: false,
    optional: false,
    allowBaseSubstitute: false,
    allowBrandedSubstitutes: false,
    substitutes: [],
    pendingExactMatch: null,
  });

  // ingredients list
  const [ings, setIngs] = useState(() =>
    initialIngredient ? [createBaseRow(initialIngredient)] : [createBaseRow()]
  );

  const resetKey = route.params?.resetKey;
  const prevResetKey = useRef(resetKey);
  const resetForm = useCallback(
    (ing) => {
      setName("");
      setPhotoUri(null);
      setTags(defaultTags);
      setDescription("");
      setInstructions("");
      setGlassId("cocktail_glass");
      setIngs([createBaseRow(ing)]);
    },
    [defaultTags]
  );

  useEffect(() => {
    if (resetKey != null && resetKey !== prevResetKey.current) {
      resetForm(initialIngredient);
      prevResetKey.current = resetKey;
    }
  }, [resetKey, initialIngredient, resetForm]);

  // ingredients for suggestions
  const [allIngredients, setAllIngredients] = useState(globalIngredients);
  useEffect(() => {
    setAllIngredients(globalIngredients);
  }, [globalIngredients]);

  // SUBSTITUTE MODAL STATE
  const [subModal, setSubModal] = useState({
    visible: false,
    forLocalId: null,
    query: "",
  });
  const debouncedSubQuery = useDebounced(subModal.query, 150);

  useEffect(() => {
    if (subModal.visible) {
      setTimeout(() => subSearchRef.current?.focus(), 0);
    }
  }, [subModal.visible]);

  const openSubstituteModal = useCallback((localId) => {
    setSubModal({ visible: true, forLocalId: localId, query: "" });
  }, []);
  const closeSubstituteModal = useCallback(() => {
    setSubModal((s) => ({ ...s, visible: false }));
  }, []);

  const modalTargetRow = useMemo(
    () => ings.find((r) => r.localId === subModal.forLocalId) || null,
    [ings, subModal.forLocalId]
  );

  const modalExcludedIds = useMemo(() => {
    const ids = new Set();
    if (modalTargetRow?.selectedId) ids.add(modalTargetRow.selectedId);
    (modalTargetRow?.substitutes || []).forEach((s) => ids.add(s.id));
    return ids;
  }, [modalTargetRow]);

  const modalQueryTokens = useMemo(
    () =>
      normalizeSearch(debouncedSubQuery)
        .split(WORD_SPLIT_RE)
        .filter(Boolean),
    [debouncedSubQuery]
  );

  const modalSuggestions = useMemo(() => {
    let list = Array.isArray(allIngredients) ? allIngredients : [];
    if (modalQueryTokens.length) {
      list = list.filter((i) =>
        wordPrefixMatch(i.searchTokens || [], modalQueryTokens)
      );
    }
    list = list.filter((i) => !modalExcludedIds.has(i.id));
    return list.slice(0, 40);
  }, [allIngredients, modalQueryTokens, modalExcludedIds]);


  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showInfo("Permission required", "Allow access to media library");
      return;
    }
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

  const toggleTagById = useCallback(
    (id) => {
      setTags((prev) => {
        const exists = prev.some((t) => t.id === id);
        if (exists) return prev.filter((t) => t.id !== id);
        const toAdd =
          availableTags.find((t) => t.id === id) ||
          BUILTIN_COCKTAIL_TAGS.find((t) => t.id === id);
        return toAdd ? [...prev, toAdd] : prev;
      });
    },
    [availableTags]
  );

  const updateRow = useCallback((localId, patch) => {
    setIngs((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const removeRow = useCallback((localId) => {
    setIngs((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)
    );
  }, []);

  const addRow = useCallback(() => {
    setIngs((prev) => [
      ...prev,
      {
        localId: Date.now() + Math.random(),
        name: "",
        selectedId: null,
        selectedItem: null,
        quantity: "",
        unitId: UNIT_ID.ML,
        garnish: false,
        optional: false,
        allowBaseSubstitute: false,
        allowBrandedSubstitutes: false,
        substitutes: [],
        pendingExactMatch: null,
      },
    ]);
  }, []);

  /* Move ingredient (Reanimated layout transition handles animation) */
  const moveIngredient = useCallback((fromIndex, toIndex) => {
    setIngs((prev) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  // OPEN AddIngredient with prefilled name; return result via params
  const openAddIngredient = useCallback(
    (initialName, localId) => {
      navigation.navigate("Ingredients", {
        screen: "AddIngredient",
        params: {
          initialName,
          targetLocalId: localId,
          returnTo: route.name,
        },
      });
    },
    [navigation, route.name]
  );

  // Catch created ingredient returned from AddIngredient
  useFocusEffect(
    useCallback(() => {
      const created = route.params?.createdIngredient;
      const targetLocalId = route.params?.targetLocalId;
      if (!created || targetLocalId == null) return;

      setAllIngredients((prev) =>
        prev.some((i) => i.id === created.id) ? prev : [...prev, created]
      );

      setIngs((prev) =>
        prev.map((r) =>
          r.localId === targetLocalId
            ? {
                ...r,
                name: created.name,
                selectedId: created.id,
                selectedItem: created,
                pendingExactMatch: null,
              }
            : r
        )
      );

      navigation.setParams({
        createdIngredient: undefined,
        targetLocalId: undefined,
      });
    }, [route.params, navigation])
  );

  const handleSave = useCallback(async () => {
    const title = name.trim();
    if (!title) {
      showInfo("Validation", "Please enter a cocktail name.");
      return;
    }
    const nonEmptyIngredients = ings.filter((r) => r.name.trim().length > 0);
    if (nonEmptyIngredients.length === 0) {
      showInfo("Validation", "Please add at least one ingredient.");
      return;
    }

    const committed = nonEmptyIngredients.map((r) => {
      if (r.selectedId == null && r.pendingExactMatch) {
        return {
          ...r,
          selectedId: r.pendingExactMatch.id,
          selectedItem: r.pendingExactMatch,
          pendingExactMatch: null,
        };
      }
      return { ...r, pendingExactMatch: null };
    });
    setIngs((prev) =>
      prev.map((r) => {
        if (r.selectedId == null && r.pendingExactMatch) {
          return {
            ...r,
            selectedId: r.pendingExactMatch.id,
            selectedItem: r.pendingExactMatch,
            pendingExactMatch: null,
          };
        }
        return r.pendingExactMatch ? { ...r, pendingExactMatch: null } : r;
      })
    );

    const cocktail = {
      id: Date.now(),
      name: title,
      photoUri: photoUri || null,
      tags,
      description: description.trim(),
      instructions: instructions.trim(),
      glassId,
      ingredients: committed.map((r, idx) => ({
        order: idx + 1,
        ingredientId: r.selectedId,
        name: r.name.trim(),
        amount: r.quantity.trim(),
        unitId: r.unitId,
        garnish: !!r.garnish,
        optional: !!r.optional,
        allowBaseSubstitute: !!r.allowBaseSubstitute,
        allowBrandedSubstitutes: !!r.allowBrandedSubstitutes,
        substitutes: r.substitutes || [],
      })),
      createdAt: Date.now(),
    };
    try {
      const created = await addCocktail(cocktail);
      const allowSubs = await getAllowSubstitutes();
      setCocktails((prev) => {
        const next = [...prev, created];
        const nextUsage = addCocktailToUsageMap(
          usageMap,
          globalIngredients,
          created,
          {
            allowSubstitutes: !!allowSubs,
          }
        );
        setUsageMap(nextUsage);
        setIngredients(
          applyUsageMapToIngredients(globalIngredients, nextUsage, next)
        );
        return next;
      });
      if (fromIngredientFlow) {
        navigation.replace("CocktailDetails", {
          id: created.id,
          backToIngredientId: initialIngredient?.id,
          initialCocktail: created,
        });
      } else {
        navigation.replace("CocktailDetails", {
          id: created.id,
          initialCocktail: created,
        });
      }
    } catch (e) {
      console.error("Failed to save cocktail", e);
    }
  }, [
    name,
    photoUri,
    tags,
    description,
    instructions,
    glassId,
    ings,
    usageMap,
    globalIngredients,
    setCocktails,
    setUsageMap,
    setIngredients,
    navigation,
    fromIngredientFlow,
    initialIngredient?.id,
  ]);

  const selectedGlass = getGlassById(glassId) || { name: "Cocktail glass" };

  // Додавання сабституту з модалки без її закриття
  const addSubstituteToTarget = useCallback(
    (ingredient) => {
      setIngs((prev) =>
        prev.map((r) => {
          if (r.localId !== subModal.forLocalId) return r;
          const existing = r.substitutes || [];
          if (existing.some((s) => s.id === ingredient.id)) return r;
          return {
            ...r,
            substitutes: [
              ...existing,
              { id: ingredient.id, name: ingredient.name },
            ],
          };
        })
      );
    },
    [subModal.forLocalId]
  );

  /* ---------- Центрування інпута при focus ---------- */
  const scrollRef = useRef(null);
  const viewportRef = useRef(null);
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
      if (contentH <= viewportH) return; // нема що скролити

      const viewportHeight =
        viewportH || Dimensions.get("window").height; // висота в’юпорта
      const visibleHeight = viewportHeight - kbHeight; // видиме поле над клавіатурою
      const targetCenter = visibleHeight / 2; // бажаний центр інпуту
      const DEAD = 10; // додатковий відступ
      const EXTRA_SCROLL = 10; // підкручуємо трохи вище

      const tryOnce = () => {
        if (!nodeRef?.current) return;
        nodeRef.current.measureInWindow((ix, iy, iw, ih) => {
          const inputCenter = iy + ih / 2;
          const delta = inputCenter - targetCenter; // наскільки нижче центра
          if (delta > DEAD || kbHeight === 0) {
            const maxY = Math.max(0, contentH - viewportH);
            // Скролимо лише вниз (піднімаємо контент), не опускаємо
            const targetY = Math.min(scrollY + delta + DEAD, maxY);
            if (targetY > scrollY) {
              const adjustedY = Math.min(targetY + EXTRA_SCROLL, maxY);
              scrollRef.current.scrollTo({ y: adjustedY, animated: true });
            }
          }
        });
      };

      // одразу + повтор після відкриття клавіатури
      tryOnce();
      setTimeout(tryOnce, 80);
    },
    [viewportH, kbHeight, contentH, scrollY]
  );

  // refs для верхніх полів
  const screenNameRef = useRef(null);
  const descRef = useRef(null);
  const instrRef = useRef(null);

  return (
    <>
      <View
        ref={viewportRef}
        collapsable={false}
        style={{ flex: 1 }}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 60 + kbHeight },
          ]}
          onContentSizeChange={(_, h) => setContentH(h)}
          scrollIndicatorInsets={{ bottom: kbHeight }}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: theme.colors.background }}
        >
          {/* Name */}
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Name
          </Text>
          <TextInput
            ref={screenNameRef}
            collapsable={false}
            onFocus={() => requestScrollIntoView(screenNameRef)}
            placeholder="e.g. Margarita"
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

          {/* Glass (left) + Photo (right) */}
          <View style={styles.mediaRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.label, { color: theme.colors.onBackground }]}
              >
                Glass
              </Text>
              <GlassPopover
                selectedGlass={selectedGlass}
                onSelect={(g) => setGlassId(g.id)}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.label, { color: theme.colors.onBackground }]}
              >
                Photo
              </Text>
              <Pressable
                onPress={pickImage}
                android_ripple={{
                  color: withAlpha(theme.colors.tertiary, 0.2),
                }}
                style={[
                  styles.mediaSquare,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.mediaImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      margin: 8,
                      textAlign: "center",
                    }}
                  >
                    Tap to select image
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Tags */}
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
                  rippleColor={withAlpha(theme.colors.tertiary, 0.25)}
                  defaultColor={theme.colors.secondary}
                  textColor={theme.colors.onSecondary}
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
                    rippleColor={withAlpha(theme.colors.tertiary, 0.25)}
                    defaultColor={theme.colors.secondary}
                    textColor={theme.colors.onSecondary}
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

          {/* Description */}
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Description
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

          {/* Instructions */}
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Instructions
          </Text>
          <TextInput
            ref={instrRef}
            collapsable={false}
            onFocus={() => requestScrollIntoView(instrRef)}
            placeholder="1. Grab some ice..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={instructions}
            onChangeText={setInstructions}
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

          {/* Ingredients list */}
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Ingredients
          </Text>

          {ings.map((row, idx) => (
            <Animated.View
              key={row.localId}
              layout={LinearTransition.springify().damping(18).stiffness(220)}
              entering={FadeInDown.duration(180)}
              exiting={FadeOutUp.duration(140)}
            >
              <CocktailIngredientRow
                index={idx}
                row={row}
                allIngredients={allIngredients}
                onChange={(patch) => updateRow(row.localId, patch)}
                onRemove={() => removeRow(row.localId)}
                onAddNewIngredient={(nm) => openAddIngredient(nm, row.localId)}
                canRemove={ings.length > 1}
                canMoveUp={ings.length > 1 && idx > 0}
                canMoveDown={ings.length > 1 && idx < ings.length - 1}
                onMoveUp={() => moveIngredient(idx, idx - 1)}
                onMoveDown={() => moveIngredient(idx, idx + 1)}
                onOpenSubstitutePicker={() => openSubstituteModal(row.localId)}
                showInfo={showInfo}
                requestScrollIntoView={requestScrollIntoView}
              />
            </Animated.View>
          ))}

          {/* Add ingredient button */}
          <Pressable
            onPress={addRow}
            android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
            style={[
              styles.addIngBtn,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              Add ingredient
            </Text>
          </Pressable>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            android_ripple={{ color: withAlpha(theme.colors.onPrimary, 0.15) }}
            style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: "700" }}>
              Save cocktail
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <CocktailTagsModal
        visible={tagsModalVisible}
        onClose={closeTagsModal}
        autoAdd={tagsModalAutoAdd}
      />

      {/* Substitute Picker Modal */}
      <Portal>
        <Modal
          visible={subModal.visible}
          onDismiss={closeSubstituteModal}
          contentContainerStyle={[
            styles.modalContainer,
            {
              marginTop: -150,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Add substitute
          </Text>

          <TextInput
            ref={subSearchRef}
            autoFocus
            placeholder="Search ingredient..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={subModal.query}
            onChangeText={(t) => setSubModal((s) => ({ ...s, query: t }))}
            style={[
              styles.input,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
                backgroundColor: theme.colors.background,
                marginTop: 12,
              },
            ]}
          />

          <View
            style={[
              styles.modalListWrap,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <FlatList
              data={modalSuggestions}
              keyExtractor={(it) => String(it.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    addSubstituteToTarget(item);
                  }}
                  android_ripple={{
                    color: withAlpha(theme.colors.tertiary, 0.1),
                  }}
                  style={styles.modalItemPressable}
                >
                  {index > 0 ? (
                    <TinyDivider color={theme.colors.outlineVariant} />
                  ) : null}
                    <View
                      style={[
                        styles.modalItemRow,
                        item.baseIngredientId != null && {
                          ...styles.brandedStripe,
                          borderLeftColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <View style={styles.modalItemAvatar}>
                        {item.photoUri ? (
                          <Image
                            source={{ uri: item.photoUri }}
                            style={styles.modalItemImg}
                            resizeMode="contain"
                          />
                      ) : (
                        <MaterialIcons
                          name="local-drink"
                          size={20}
                          color={withAlpha(theme.colors.onSurface, 0.5)}
                        />
                      )}
                    </View>
                    <Text
                      style={{ color: theme.colors.onSurface, flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <MaterialIcons
                      name="add-circle-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ padding: 16 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    No ingredients found
                  </Text>
                </View>
              }
              style={{ maxHeight: 360 }}
            />
          </View>

          <Text
            style={{
              marginTop: 10,
              color: theme.colors.onSurfaceVariant,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Tap outside to close
          </Text>
        </Modal>
      </Portal>
      {infoDialog}
    </>
  );
}

/* ---------- styles ---------- */
const IMAGE_SIZE = 150;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 16 },
  labelText: { fontWeight: "bold" },

  // input + inline add in one row
  inputRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },

  nameInputWrap: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginTop: 8,
  },

  nameInput: {
    paddingRight: 72,
  },

  multiline: { minHeight: 80, textAlignVertical: "top" },

  // media row: glass + photo
  mediaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  mediaSquare: {
    marginTop: 8,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaImg: {
    width: "100%",
    height: "100%",
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

  // ingredient card
  ingCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  ingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: { padding: 4, marginLeft: 4 },
  removeBtn: { padding: 4, marginLeft: 4 },

  row2: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  unitAnchor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },

  checkbox: { flexDirection: "row", alignItems: "center" },
  checkboxLabel: { marginLeft: 6, fontSize: 13 },

  subBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // substitutes
  subHeader: {
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 6,
  },
  subList: {
    gap: 6,
  },
  subItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  addIngBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },

  saveBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  addInlineBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: "-50%" }],
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
    flexWrap: "nowrap",
  },

  // контейнер меню підказок (прямокутник без трикутника)
  suggestBox: {
    position: "absolute",
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 6, // Android shadow
    // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  /* Modal */
  modalContainer: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontWeight: "700", fontSize: 16 },
  modalListWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalItemPressable: {},
  modalItemRow: {
    paddingHorizontal: 12,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalItemImg: {
    width: "100%",
    height: "100%",
  },
  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
});
