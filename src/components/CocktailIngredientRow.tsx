import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  FlatList,
  Dimensions,
  Keyboard,
  Platform,
} from "react-native";
import { useTheme, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { Menu, MenuOptions, MenuOption, MenuTrigger, renderers } from "react-native-popup-menu";
const { Popover } = renderers;

import TinyDivider from "./TinyDivider";
import useDebounced from "../hooks/useDebounced";
import useKeyboardHeight from "../hooks/useKeyboardHeight";
import { normalizeSearch } from "../utils/normalizeSearch";
import { WORD_SPLIT_RE, wordPrefixMatch } from "../utils/wordPrefixMatch";
import { withAlpha } from "../utils/color";
import { UNIT_ID, getUnitById, formatUnit } from "../constants/measureUnits";

/* ---------- CocktailIngredientRow ---------- */
const SUGGEST_ROW_H = 56;

const CocktailIngredientRow = memo(function CocktailIngredientRow({
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
  showInfo,
  requestScrollIntoView, // ← буде викликатись при focus інпутів
}) {
  const MIN_CHARS = 2;
  const theme = useTheme();
  const [query, setQuery] = useState(row.name || "");
  const setFocusedRef = (arguments?.[0]?.setFocusedRef) || null;
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

  // keyboard height from global hook
  const kbHeight = useKeyboardHeight();

  // положення випадаючого списку назв інгредієнтів
  const [suggestState, setSuggestState] = useState({
    visible: false,
    placement: "bottom",
    maxHeight: 300,
    top: 0,
    left: 0,
  });
  const [openedFor, setOpenedFor] = useState(null);

  const showSuggest = debounced.trim().length >= MIN_CHARS && !row.selectedId;
  const queryTokens = useMemo(
    () =>
      normalizeSearch(debounced)
        .split(WORD_SPLIT_RE)
        .filter(Boolean),
    [debounced]
  );

  const suggestions = useMemo(() => {
    if (!showSuggest) return [];
    if (queryTokens.length === 0) return [];
    return allIngredients
      .filter((i) => wordPrefixMatch(i.searchTokens || [], queryTokens))
      .slice(0, 20);
  }, [allIngredients, showSuggest, queryTokens]);

  // sync from external
  useEffect(() => {
    if (row.name !== query) setQuery(row.name || "");
  }, [row.name]);

  // перерахунок placement/maxHeight/позиції (від контейнера навколо інпута)
  const recalcPlacement = useCallback(() => {
    const start = Date.now();
    const startedAt = new Date(start).toISOString();
    if (!nameAnchorRef.current) {
      const duration = Date.now() - start;
      console.log(`[recalcPlacement] start=${startedAt} duration=${duration}ms`);
      return;
    }
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

      const duration = Date.now() - start;
      console.log(`[recalcPlacement] start=${startedAt} duration=${duration}ms`);
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
    if (!q) {
      if (row.pendingExactMatch) onChange({ pendingExactMatch: null });
      return;
    }
    const match = allIngredients.find(
      (i) => collator.compare((i.name || "").trim(), q) === 0
    );
    if (match) {
      if (row.pendingExactMatch?.id !== match.id) {
        onChange({ pendingExactMatch: match });
      }
    } else if (row.pendingExactMatch) {
      onChange({ pendingExactMatch: null });
    }
  }, [
    query,
    debounced,
    row.selectedId,
    row.pendingExactMatch,
    allIngredients,
    collator,
    onChange,
  ]);

  const hasExactMatch = useMemo(() => {
    const t = query.trim();
    if (!t) return true;
    return allIngredients.some(
      (i) => collator.compare((i.name || "").trim(), t) === 0
    );
  }, [allIngredients, collator, query]);

  const showAddNewBtn =
    !row.selectedId && query.trim().length > 1 && !hasExactMatch;

  // currently selected ingredient (fallback to list by id)
  const selected = useMemo(
    () =>
      row.selectedItem ||
      allIngredients.find((i) => i.id === row.selectedId) ||
      null,
    [row.selectedItem, row.selectedId, allIngredients]
  );

  // базовий інгредієнт для підказки
  const baseIngredientName = useMemo(() => {
    const baseId = selected?.baseIngredientId;
    if (!baseId) return null;
    return allIngredients.find((i) => i.id === baseId)?.name || null;
  }, [selected?.baseIngredientId, allIngredients]);

  // інші брендовані інгредієнти того ж базового (крім вибраного)
  const brandedSiblings = useMemo(() => {
    const baseId = selected?.baseIngredientId;
    if (!baseId) return [];
    return allIngredients
      .filter((i) => i.baseIngredientId === baseId && i.id !== selected?.id)
      .map((i) => i.name)
      .filter(Boolean);
  }, [selected?.baseIngredientId, selected?.id, allIngredients]);

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
          <Text
            style={[
              styles.labelText,
              { marginLeft: 8, color: theme.colors.onSurface },
            ]}
          >
            Ingredient
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
            onFocus={() => {
              setFocusedRef?.(nameInputRef);
              requestScrollIntoView?.(nameInputRef);
            }}
            placeholder="Type ingredient name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              onChange({
                name: t,
                selectedId: null,
                selectedItem: null,
                pendingExactMatch: null,
              });
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
                      pendingExactMatch: null,
                    });
                    setQuery(item.name);
                    handleDismissSuggest();
                  }}
                  android_ripple={{
                    color: withAlpha(theme.colors.tertiary, 0.1),
                  }}
                >
                  {index > 0 ? (
                    <TinyDivider color={theme.colors.outlineVariant} />
                  ) : null}
                  <View
                    style={[
                      {
                        height: SUGGEST_ROW_H,
                        paddingHorizontal: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      },
                      item.baseIngredientId && {
                        borderLeftWidth: 4,
                        borderLeftColor: theme.colors.primary,
                        paddingLeft: 8,
                      },
                    ]}
                  >
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
            onFocus={() => {
              setFocusedRef?.(amountInputRef);
              requestScrollIntoView?.(amountInputRef);
            }}
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
                      <TinyDivider color={theme.colors.outlineVariant} />
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

        {selected?.baseIngredientId ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {checkbox(row.allowBaseSubstitute, "Allow base substitute", () =>
              onChange({ allowBaseSubstitute: !row.allowBaseSubstitute })
            )}
            <Pressable
              onPress={() =>
                showInfo(
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

        {selected?.baseIngredientId ? (
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
                showInfo(
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
                    s.baseIngredientId != null && {
                      ...styles.brandedStripe,
                      borderLeftColor: theme.colors.primary,
                    },
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


const styles = StyleSheet.create({
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
  labelText: { fontWeight: "bold" },
  iconBtn: { padding: 4, marginLeft: 4 },
  removeBtn: { padding: 4, marginLeft: 4 },
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
  row2: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  label: { fontWeight: "bold", marginTop: 16 },
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
  suggestBox: {
    position: "absolute",
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
});

export default CocktailIngredientRow;
