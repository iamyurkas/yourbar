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
  Alert,
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
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import { useTheme, Portal, Modal } from "react-native-paper";
import { TAG_COLORS } from "../../theme";
import { MaterialIcons } from "@expo/vector-icons";
import { HeaderBackButton } from "@react-navigation/elements";
import { useTabMemory } from "../../context/TabMemoryContext";

import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
  renderers,
} from "react-native-popup-menu";
const { Popover } = renderers;

import { getAllIngredients } from "../../storage/ingredientsStorage";
import { addCocktail } from "../../storage/cocktailsStorage";
import { BUILTIN_COCKTAIL_TAGS } from "../../constants/cocktailTags";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import { UNIT_ID, getUnitById, formatUnit } from "../../constants/measureUnits";
import { GLASSWARE, getGlassById } from "../../constants/glassware";

import CocktailTagsModal from "../../components/CocktailTagsModal";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import {
  addCocktailToUsageMap,
  applyUsageMapToIngredients,
} from "../../utils/ingredientUsage";
import { getAllowSubstitutes } from "../../storage/settingsStorage";


/* ---------- helpers ---------- */
const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 9))
    return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex.length === 7 ? `${hex}${a}` : `${hex.slice(0, 7)}${a}`;
};

const useDebounced = (value, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
};

// --- word-prefix matching (початок кожного слова) ---
const normalizeUk = (s) => (s || "").toLocaleLowerCase("uk");
const WORD_SPLIT_RE = /[^a-z0-9\u0400-\u04FF]+/i;
const wordPrefixMatch = (name, query) => {
  const words = normalizeUk(name).split(WORD_SPLIT_RE).filter(Boolean);
  const parts = normalizeUk(query).trim().split(WORD_SPLIT_RE).filter(Boolean);
  if (parts.length === 0) return false;
  let wi = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    while (wi < words.length && !words[wi].startsWith(p)) wi++;
    if (wi === words.length) return false;
    wi++;
  }
  return true;
};

/* ---------- Tiny Divider ---------- */
const Divider = ({ color, style }) => (
  <View
    style={[
      {
        height: StyleSheet.hairlineWidth,
        backgroundColor: color,
        opacity: 0.5,
      },
      style,
    ]}
  />
);

/* ---------- TagPill ---------- */
const TagPill = memo(function TagPill({ id, name, color, onToggle }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onToggle(id)}
      android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.25) }}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: color || theme.colors.secondary },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>
        {name}
      </Text>
    </Pressable>
  );
});

/* ---------- IngredientRow ---------- */
const SUGGEST_ROW_H = 56;

const IngredientRow = memo(function IngredientRow({
  index,
  row,
  onChange,
  onRemove,
  allIngredients,
  onAddNewIngredient,
  canRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onOpenSubstitutePicker,
  requestScrollIntoView, // ← буде викликатись при focus інпутів
}) {
  const MIN_CHARS = 2;
  const theme = useTheme();
  const [query, setQuery] = useState(row.name || "");
  const debounced = useDebounced(query, 200);

  const collator = useMemo(
    () => new Intl.Collator("uk", { sensitivity: "base" }),
    []
  );

  // refs + layout
  const nameAnchorRef = useRef(null); // для позиціювання підказок (контейнер)
  const nameInputRef = useRef(null); // для скролу у видиму зону (сам TextInput)
  const amountInputRef = useRef(null);
  const [nameWidth, setNameWidth] = useState(260);

  // --- Unit menu control (auto flip up/down) ---
  const unitTriggerRef = useRef(null);
  const [unitPlacement, setUnitPlacement] = useState("bottom");
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const openUnitMenuMeasured = useCallback(() => {
    Keyboard.dismiss();
    if (!unitTriggerRef.current) {
      setUnitPlacement("bottom");
      setUnitMenuOpen(true);
      return;
    }
    unitTriggerRef.current.measureInWindow((x, y, w, h) => {
      const screenH = Dimensions.get("window").height;
      const SAFE = 8;
      const spaceBelow = Math.max(0, screenH - (y + h) - SAFE);
      const estimatedMenuH = 350;
      setUnitPlacement(spaceBelow < estimatedMenuH ? "top" : "bottom");
      requestAnimationFrame(() => setUnitMenuOpen(true));
    });
  }, []);

  // keyboard height (локальне — для підказок)
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

  // положення випадаючого списку назв інгредієнтів
  const [suggestState, setSuggestState] = useState({
    visible: false,
    placement: "bottom",
    maxHeight: 300,
    top: 0,
    left: 0,
  });
  const [openedFor, setOpenedFor] = useState(null);

  const trimmed = debounced.trim();

  const suggestions = useMemo(() => {
    if (trimmed.length < MIN_CHARS) return [];
    return allIngredients
      .filter((i) => wordPrefixMatch(i.name || "", trimmed))
      .slice(0, 20);
  }, [allIngredients, trimmed]);

  const showSuggest =
    trimmed.length >= MIN_CHARS &&
    suggestions.length > 0 &&
    (row.selectedId == null ||
      suggestions.some((s) => s.id !== row.selectedId));

  // sync from external
  useEffect(() => {
    if (row.name !== query) setQuery(row.name || "");
  }, [row.name]);

  // перерахунок placement/maxHeight/позиції (від контейнера навколо інпута)
  const recalcPlacement = useCallback(() => {
    if (!nameAnchorRef.current) return;
    nameAnchorRef.current.measureInWindow((x, y, w, h) => {
      const screenH = Dimensions.get("window").height;
      const SAFE = 8;
      const spaceAbove = Math.max(0, y - SAFE);
      const bottomEdge = y + h;
      const spaceBelow = Math.max(0, screenH - kbHeight - bottomEdge - SAFE);

      const rows = Math.max(1, Math.min(suggestions.length, 5) || 1);
      const needed = SUGGEST_ROW_H * rows;

      const openDown = spaceBelow >= spaceAbove;
      const maxFit = Math.min(
        300,
        Math.max(SUGGEST_ROW_H, openDown ? spaceBelow : spaceAbove)
      );
      const containerHeight = Math.min(needed, maxFit);

      const top = openDown
        ? bottomEdge + 28
        : Math.max(SAFE, y - containerHeight + 28);

      setSuggestState((s) => ({
        ...s,
        placement: openDown ? "bottom" : "top",
        maxHeight: containerHeight,
        top,
        left: x,
      }));
      setNameWidth(w || nameWidth);
    });
  }, [kbHeight, suggestions.length, nameWidth]);

  useEffect(() => {
    if (suggestState.visible) recalcPlacement();
  }, [suggestions.length, debounced, kbHeight, suggestState.visible, recalcPlacement]);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", () => {
      if (suggestState.visible) recalcPlacement();
    });
    return () => sub?.remove?.();
  }, [suggestState.visible, recalcPlacement]);

  // авто-бінд по exact match
  useEffect(() => {
    const raw = query;
    const stable = debounced;
    if (!raw || row.selectedId) return;
    if (raw !== stable) return;
    const q = raw.trim();
    if (!q) return;
    const match = allIngredients.find(
      (i) => collator.compare((i.name || "").trim(), q) === 0
    );
    if (match) {
      onChange({
        selectedId: match.id,
        selectedItem: match,
        name: match.name,
      });
    }
  }, [query, debounced, row.selectedId, allIngredients, collator, onChange]);

  const hasExactMatch = useMemo(() => {
    const t = query.trim();
    if (!t) return true;
    return allIngredients.some(
      (i) => collator.compare((i.name || "").trim(), t) === 0
    );
  }, [allIngredients, collator, query]);

  const showAddNewBtn =
    !row.selectedId && query.trim().length > 1 && !hasExactMatch;

  // базовий інгредієнт для підказки
  const baseIngredientName = useMemo(() => {
    const baseId = row.selectedItem?.baseIngredientId;
    if (!baseId) return null;
    return allIngredients.find((i) => i.id === baseId)?.name || null;
  }, [row.selectedItem?.baseIngredientId, allIngredients]);

  // інші брендовані інгредієнти того ж базового (крім вибраного)
  const brandedSiblings = useMemo(() => {
    const baseId = row.selectedItem?.baseIngredientId;
    if (!baseId) return [];
    return allIngredients
      .filter(
        (i) => i.baseIngredientId === baseId && i.id !== row.selectedItem?.id
      )
      .map((i) => i.name)
      .filter(Boolean);
  }, [
    row.selectedItem?.baseIngredientId,
    row.selectedItem?.id,
    allIngredients,
  ]);

  const handleDismissSuggest = useCallback(() => {
    setSuggestState((s) => ({ ...s, visible: false }));
    setOpenedFor(debounced);
  }, [debounced]);

  useEffect(() => {
    if (debounced.trim().length < MIN_CHARS) {
      setOpenedFor(null);
    }
  }, [debounced]);

  useEffect(() => {
    if (showSuggest && suggestions.length > 0) {
      if (!suggestState.visible && openedFor !== debounced) {
        setSuggestState((s) => ({ ...s, visible: true }));
        recalcPlacement();
      } else if (suggestState.visible) {
        recalcPlacement();
      }
    } else {
      if (suggestState.visible) {
        setSuggestState((s) => ({ ...s, visible: false }));
      }
    }
  }, [showSuggest, suggestions.length, debounced, openedFor, recalcPlacement]);

  // ⚙️ Список юнітів з constants
  const UNIT_LIST = useMemo(() => {
    return Object.values(UNIT_ID)
      .map((id) => getUnitById(id))
      .filter(Boolean);
  }, []);

  const selectedUnit = getUnitById(row.unitId) ||
    getUnitById(UNIT_ID.ML) || { name: "ml" };

  const checkbox = (checked, label, onToggle) => (
    <Pressable
      onPress={onToggle}
      style={styles.checkbox}
      android_ripple={{
        color: withAlpha(theme.colors.tertiary, 0.2),
        borderless: true,
      }}
    >
      <MaterialIcons
        name={checked ? "check-box" : "check-box-outline-blank"}
        size={20}
        color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
      />
      <Text
        style={[
          styles.checkboxLabel,
          {
            color: checked
              ? theme.colors.onSurface
              : theme.colors.onSurfaceVariant,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.ingCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      {/* Header: reorder controls + index + remove */}
      <View style={styles.ingHeader}>
        <View style={styles.headerLeft}>
          <Text style={{ fontWeight: "700", color: theme.colors.onSurface }}>
            {index + 1}.
          </Text>

          {canRemove ? (
            <>
              {/* Move up */}
              <Pressable
                onPress={onMoveUp}
                disabled={!canMoveUp}
                android_ripple={{
                  color: withAlpha(theme.colors.tertiary, 0.12),
                  borderless: true,
                }}
                style={[styles.iconBtn, !canMoveUp && { opacity: 0.4 }]}
              >
                <MaterialIcons
                  name="arrow-upward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {/* Move down */}
              <Pressable
                onPress={onMoveDown}
                disabled={!canMoveDown}
                android_ripple={{
                  color: withAlpha(theme.colors.tertiary, 0.12),
                  borderless: true,
                }}
                style={[styles.iconBtn, !canMoveDown && { opacity: 0.4 }]}
              >
                <MaterialIcons
                  name="arrow-downward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            </>
          ) : null}
        </View>

        {canRemove ? (
          <Pressable
            onPress={onRemove}
            android_ripple={{
              color: withAlpha(theme.colors.error, 0.12),
              borderless: true,
            }}
            style={styles.removeBtn}
          >
            <MaterialIcons
              name="delete-outline"
              size={20}
              color={theme.colors.error}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Ingredient */}
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: theme.colors.onSurface }]}>
          Ingredient
        </Text>
      </View>

      {/* Name input + inline [+Add] */}
      <View style={styles.inputRow}>
        <View
          ref={nameAnchorRef}
          collapsable={false}
          style={styles.nameInputWrap}
          onLayout={(e) => setNameWidth(e.nativeEvent.layout.width)}
        >
          <TextInput
            ref={nameInputRef}
            collapsable={false}
            onFocus={() => requestScrollIntoView?.(nameInputRef)}
            placeholder="Type ingredient name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              onChange({ name: t, selectedId: null, selectedItem: null });
            }}
            style={[
              styles.input,
              styles.nameInput,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
                backgroundColor: theme.colors.background,
                marginTop: 0,
              },
            ]}
            returnKeyType="done"
          />
        </View>

        {showAddNewBtn ? (
          <Pressable
            onPress={() => onAddNewIngredient(query.trim())}
            android_ripple={{
              color: withAlpha(theme.colors.tertiary, 0.2),
              borderless: true,
            }}
            style={styles.addInlineBtn}
            accessibilityLabel="Add new ingredient"
          >
            <MaterialIcons name="add" size={18} color={theme.colors.primary} />
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.primary, fontWeight: "600" }}
            >
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Suggest dropdown */}
      {suggestState.visible ? (
        <Portal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleDismissSuggest}
          />
          <View
            style={[
              styles.suggestBox,
              {
                top: suggestState.top,
                left: suggestState.left,
                width: nameWidth || 260,
                maxHeight: suggestState.maxHeight,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                shadowColor: theme.colors.onSurface,
              },
            ]}
          >
            <FlatList
              data={suggestions}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    onChange({
                      name: item.name,
                      selectedId: item.id,
                      selectedItem: item,
                    });
                    setQuery(item.name);
                    handleDismissSuggest();
                  }}
                  android_ripple={{
                    color: withAlpha(theme.colors.tertiary, 0.1),
                  }}
                >
                  {index > 0 ? (
                    <Divider color={theme.colors.outlineVariant} />
                  ) : null}
                  <View
                    style={{
                      height: SUGGEST_ROW_H,
                      paddingHorizontal: 12,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 4,
                        height: 28,
                        borderRadius: 2,
                        marginRight: 8,
                        backgroundColor: item.baseIngredientId
                          ? theme.colors.onSurfaceVariant
                          : "transparent",
                      }}
                    />
                    {item.photoUri ? (
                      <Image
                        source={{ uri: item.photoUri }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          marginRight: 10,
                          backgroundColor: theme.colors.background,
                        }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          marginRight: 10,
                          backgroundColor: theme.colors.outlineVariant,
                        }}
                      />
                    )}
                    <Text
                      style={{ color: theme.colors.onSurface, flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>
                </Pressable>
              )}
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_, i) => ({
                length: SUGGEST_ROW_H,
                offset: SUGGEST_ROW_H * i,
                index: i,
              })}
            />
          </View>
        </Portal>
      ) : null}

      {/* Amount + Unit */}
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Amount
          </Text>
          <TextInput
            ref={amountInputRef}
            collapsable={false}
            onFocus={() => requestScrollIntoView?.(amountInputRef)}
            placeholder="e.g. 45"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="decimal-pad"
            value={row.quantity}
            onChangeText={(t) => onChange({ quantity: t })}
            style={[
              styles.input,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
                backgroundColor: theme.colors.background,
              },
            ]}
          />
        </View>

        {/* Unit popover with auto flip */}
        <View style={{ width: 160 }}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Unit
          </Text>

          <Menu
            opened={unitMenuOpen}
            onBackdropPress={() => setUnitMenuOpen(false)}
            onClose={() => setUnitMenuOpen(false)}
            renderer={Popover}
            rendererProps={{
              placement: unitPlacement,
              preferredPlacement: "bottom",
              showArrow: false,
            }}
          >
            <MenuTrigger
              disabled
              customStyles={{
                TriggerTouchableComponent: Pressable,
                triggerTouchable: {
                  onPress: openUnitMenuMeasured,
                },
              }}
            >
              <View
                ref={unitTriggerRef}
                collapsable={false}
                style={[
                  styles.input,
                  styles.unitAnchor,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.onSurface }}>
                  {formatUnit(selectedUnit, row.quantity) || "ml"}
                </Text>
                <MaterialIcons
                  name="arrow-drop-down"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            </MenuTrigger>

            <MenuOptions
              customStyles={{
                optionsContainer: {
                  width: 160,
                  maxHeight: 300,
                  backgroundColor: theme.colors.surface,
                  padding: 0,
                  borderRadius: 8,
                  overflow: "hidden",
                  ...(unitPlacement === "top"
                    ? { transform: [{ translateY: 14 }] }
                    : { marginTop: -6 }),
                },
              }}
            >
              <FlatList
                data={UNIT_LIST}
                keyExtractor={(u) => String(u.id || u.name)}
                renderItem={({ item, index }) => (
                  <View>
                    {index > 0 ? (
                      <Divider color={theme.colors.outlineVariant} />
                    ) : null}
                    <MenuOption
                      closeOnSelect
                      onSelect={() => {
                        onChange({ unitId: item.id });
                        setUnitMenuOpen(false);
                      }}
                      customStyles={{ optionWrapper: { padding: 0 } }}
                    >
                      <View
                        style={{
                          height: 48,
                          paddingHorizontal: 12,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.onSurface,
                            flex: 1,
                            fontWeight: row.unitId === item.id ? "700" : "400",
                          }}
                        >
                          {formatUnit(item, row.quantity)}
                        </Text>
                        {row.unitId === item.id ? (
                          <MaterialIcons
                            name="check"
                            size={18}
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </View>
                    </MenuOption>
                  </View>
                )}
                extraData={row.quantity}
                keyboardShouldPersistTaps="handled"
                getItemLayout={(_, i) => ({
                  length: 48,
                  offset: 48 * i,
                  index: i,
                })}
              />
            </MenuOptions>
          </Menu>
        </View>
      </View>

      {/* Checkboxes */}
      <View style={styles.rowWrap}>
        {checkbox(row.garnish, "Garnish", () =>
          onChange({ garnish: !row.garnish })
        )}
        {checkbox(row.optional, "Optional", () =>
          onChange({ optional: !row.optional })
        )}

        {row.selectedItem?.baseIngredientId ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {checkbox(row.allowBaseSubstitute, "Allow base substitute", () =>
              onChange({ allowBaseSubstitute: !row.allowBaseSubstitute })
            )}
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Allow base substitute",
                  `If the specified ingredient isn't available, the cocktail will be shown as available with its base ingredient.\n\nBase ingredient:\n ${
                    baseIngredientName || "—"
                  }`
                )
              }
              hitSlop={8}
              android_ripple={{
                color: withAlpha(theme.colors.tertiary, 0.2),
                borderless: true,
              }}
              style={{ padding: 4, marginLeft: 4 }}
            >
              <MaterialIcons
                name="help-outline"
                size={18}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>
        ) : null}

        {row.selectedItem?.baseIngredientId ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {checkbox(
              row.allowBrandedSubstitutes,
              "Allow branded substitutes",
              () =>
                onChange({
                  allowBrandedSubstitutes: !row.allowBrandedSubstitutes,
                })
            )}
            <Pressable
              onPress={() => {
                const list =
                  brandedSiblings.length > 0
                    ? `\n\nOther branded ingredients of the base:\n- ${brandedSiblings.join(
                        "\n- "
                      )}`
                    : "";
                Alert.alert(
                  "Allow branded substitutes",
                  `If the specified ingredient isn't available, the cocktail will be shown as available with branded ingredients of the base.${list}`
                );
              }}
              hitSlop={8}
              android_ripple={{
                color: withAlpha(theme.colors.tertiary, 0.2),
                borderless: true,
              }}
              style={{ padding: 4, marginLeft: 4 }}
            >
              <MaterialIcons
                name="help-outline"
                size={18}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Substitute button */}
      <Pressable
        onPress={onOpenSubstitutePicker}
        android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
        style={[
          styles.subBtn,
          {
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <MaterialIcons name="add" size={18} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
          Add substitute
        </Text>
      </Pressable>

      {/* Substitutes header + list */}
      {Array.isArray(row.substitutes) && row.substitutes.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.subHeader, { color: theme.colors.onSurface }]}>
            Substitutes
          </Text>
          <View style={styles.subList}>
            {row.substitutes.map((s) => (
              <View
                key={s.id}
                style={[
                  styles.subItem,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor:
                      theme.colors.surfaceVariant ??
                      withAlpha(theme.colors.onSurface, 0.04),
                  },
                ]}
              >
                <Text
                  style={{ color: theme.colors.onSurface, flex: 1 }}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
                <Pressable
                  onPress={() =>
                    onChange({
                      substitutes: (row.substitutes || []).filter(
                        (x) => x.id !== s.id
                      ),
                    })
                  }
                  android_ripple={{
                    color: withAlpha(theme.colors.tertiary, 0.15),
                    borderless: true,
                  }}
                  style={{ padding: 6, marginLeft: 6 }}
                  accessibilityLabel={`Remove substitute ${s.name}`}
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
});

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
                <Divider color={theme.colors.outlineVariant} />
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
  const {
    ingredients,
    cocktails,
    setCocktails,
    usageMap,
    setUsageMap,
    setIngredients,
  } = useIngredientUsage();
  const initialIngredient = route.params?.initialIngredient;
  const fromIngredientFlow = initialIngredient != null;
  const lastCocktailsTab =
    (typeof getTab === "function" && getTab("cocktails")) || "All";

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
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState(() => {
    const custom = BUILTIN_COCKTAIL_TAGS.find((t) => t.id === 8);
    return custom ? [custom] : [{ id: 8, name: "custom", color: TAG_COLORS[15] }];
  });
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

  // ingredients list
  const [ings, setIngs] = useState(() => {
    const baseRow = {
      localId: Date.now(),
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
    };
    if (initialIngredient) {
      return [
        {
          ...baseRow,
          name: initialIngredient.name || "",
          selectedId: initialIngredient.id ?? null,
          selectedItem: initialIngredient,
        },
      ];
    }
    return [baseRow];
  });

  // ingredients for suggestions
  const [allIngredients, setAllIngredients] = useState([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (ingredients.length) {
        if (!cancel) setAllIngredients(ingredients);
      } else {
        const list = await getAllIngredients();
        if (!cancel) setAllIngredients(Array.isArray(list) ? list : []);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [ingredients]);

  // SUBSTITUTE MODAL STATE
  const [subModal, setSubModal] = useState({
    visible: false,
    forLocalId: null,
    query: "",
  });
  const debouncedSubQuery = useDebounced(subModal.query, 150);

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

  const modalSuggestions = useMemo(() => {
    let list = Array.isArray(allIngredients) ? allIngredients : [];
    const q = debouncedSubQuery.trim();
    if (q) list = list.filter((i) => wordPrefixMatch(i.name || "", q));
    list = list.filter((i) => !modalExcludedIds.has(i.id));
    return list.slice(0, 40);
  }, [allIngredients, debouncedSubQuery, modalExcludedIds]);


  const pickImage = useCallback(async () => {
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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
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
      Alert.alert("Validation", "Please enter a cocktail name.");
      return;
    }
    const nonEmptyIngredients = ings.filter((r) => r.name.trim().length > 0);
    if (nonEmptyIngredients.length === 0) {
      Alert.alert("Validation", "Please add at least one ingredient.");
      return;
    }

    const cocktail = {
      id: Date.now(),
      name: title,
      photoUri: photoUri || null,
      tags,
      description: description.trim(),
      instructions: instructions.trim(),
      glassId,
      ingredients: nonEmptyIngredients.map((r, idx) => ({
        order: idx + 1,
        ingredientId: r.selectedId,
        name: r.name.trim(),
        quantity: r.quantity.trim(),
        unitId: r.unitId,
        garnish: !!r.garnish,
        optional: !!r.optional,
        allowBaseSubstitute: !!r.allowBaseSubstitute,
        allowBrandedSubstitutes: !!r.allowBrandedSubstitutes,
        substitutes: r.substitutes || [],
      })),
      createdAt: Date.now(),
    };

    const created = await addCocktail(cocktail);
    const nextCocktails = [...cocktails, created];
    setCocktails(nextCocktails);
    const allowSubs = await getAllowSubstitutes();
    const nextUsage = addCocktailToUsageMap(usageMap, ingredients, created, {
      allowSubstitutes: !!allowSubs,
    });
    setUsageMap(nextUsage);
    setIngredients(applyUsageMapToIngredients(ingredients, nextUsage, nextCocktails));
    if (fromIngredientFlow) {
      navigation.replace("CocktailDetails", {
        id: created.id,
        backToIngredientId: initialIngredient?.id,
      });
    } else {
      navigation.replace("CocktailDetails", { id: created.id });
    }
  }, [
    name,
    photoUri,
    tags,
    description,
    instructions,
    glassId,
    ings,
    cocktails,
    usageMap,
    ingredients,
    setCocktails,
    setUsageMap,
    setIngredients,
    navigation,
    fromIngredientFlow,
    initialIngredient?.id,
  ]);

  const selectedGlass = getGlassById(glassId) || { name: "Cocktail glass" };

  // Додавання сабституту з модалки + закриття модалки
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
      closeSubstituteModal();
    },
    [subModal.forLocalId, closeSubstituteModal]
  );

  /* ---------- Простий scroll-алгоритм (z + 16) ---------- */
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

      const x = viewportH || Dimensions.get("window").height; // висота в’юпорта
      const y = kbHeight; // висота клавіатури
      const DEAD = 10; // додатковий відступ
      const tryOnce = () => {
        if (!nodeRef?.current) return;
        nodeRef.current.measureInWindow((ix, iy, iw, ih) => {
          const inputBottom = iy + ih;
          const visibleLimit = x - y; // межа видимої області над клавіатурою

          // 3) якщо нижній край під клавіатурою — скролимо
          if (inputBottom - DEAD > visibleLimit || y == 0) {
            const z = inputBottom - visibleLimit; // 4)
            const delta = z + DEAD; // 5)
            const maxY = Math.max(0, contentH - viewportH);
            // cкролимо лише вниз: забороняємо зменшення y
            const targetY = Math.min(scrollY + delta, maxY) + 100; // бажана позиція
            if (targetY > scrollY) {
              scrollRef.current.scrollTo({ y: targetY, animated: true });
            }
          }
        });
      };

      // одразу + повтор після відкриття клавіатури
      tryOnce(120);
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
              <IngredientRow
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
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Add substitute
          </Text>

          <TextInput
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
                    <Divider color={theme.colors.outlineVariant} />
                  ) : null}
                  <View style={styles.modalItemRow}>
                    {item.photoUri ? (
                      <Image
                        source={{ uri: item.photoUri }}
                        style={styles.modalItemAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.modalItemAvatar,
                          { backgroundColor: theme.colors.outlineVariant },
                        ]}
                      />
                    )}
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
    </>
  );
}

/* ---------- styles ---------- */
const IMAGE_SIZE = 150;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 16 },

  // special for Ingredient + [+]
  labelRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginTop: 8,
  },

  nameInput: {},

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
    aspectRatio: 1,
    borderRadius: 6,
  },
});
