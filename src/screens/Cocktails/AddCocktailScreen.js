// src/screens/cocktails/AddCocktailScreen.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useTheme, Menu, Divider } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

import { getAllIngredients } from "../../storage/ingredientsStorage";
import { addCocktail } from "../../storage/cocktailsStorage";
import { BUILTIN_COCKTAIL_TAGS } from "../../constants/cocktailTags";
import UnitPicker from "../../components/UnitPicker";
import { UNIT_ID, getUnitById } from "../../constants/measureUnits";

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
      <Text style={styles.tagText}>{name}</Text>
    </Pressable>
  );
});

/* ---------- Anchored suggestions dropdown ---------- */
const SUGGEST_ROW_H = 48;

const IngredientSuggestMenu = memo(function IngredientSuggestMenu({
  visible,
  anchor, // {x,y}
  anchorWidth,
  items,
  onSelect,
  onDismiss,
}) {
  const theme = useTheme();
  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor || { x: 0, y: 0 }}
      contentStyle={{
        width: anchorWidth || 260,
        backgroundColor: theme.colors.surface,
      }}
    >
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item, index }) => (
          <>
            {index > 0 ? <Divider style={{ opacity: 0.5 }} /> : null}
            <Pressable
              onPress={() => {
                onSelect?.(item);
                onDismiss?.();
              }}
              android_ripple={{ color: theme.colors.outlineVariant }}
              style={({ pressed }) => [
                {
                  height: SUGGEST_ROW_H,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                },
                pressed && { opacity: 0.96 },
              ]}
            >
              {/* 4px stripe for branded; transparent for regular to keep alignment */}
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
            </Pressable>
          </>
        )}
        style={{
          height: Math.min(
            300,
            SUGGEST_ROW_H * Math.max(1, items?.length || 0)
          ),
        }}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, i) => ({
          length: SUGGEST_ROW_H,
          offset: SUGGEST_ROW_H * i,
          index: i,
        })}
      />
    </Menu>
  );
});

/* ---------- IngredientRow ---------- */
const IngredientRow = memo(function IngredientRow({
  index,
  row,
  onChange,
  onRemove,
  onOpenUnitPicker, // (anchorRef) => void
  allIngredients,
  onAddNewIngredient, // (name: string) => void
}) {
  const theme = useTheme();
  const [query, setQuery] = useState(row.name || "");
  const debounced = useDebounced(query, 200);

  const collator = useMemo(
    () => new Intl.Collator("uk", { sensitivity: "base" }),
    []
  );

  // anchors
  const nameAnchorRef = useRef(null);
  const unitAnchorRef = useRef(null);

  // anchored suggest state
  const [suggestMenu, setSuggestMenu] = useState({
    visible: false,
    anchor: null,
    width: 0,
  });

  // show suggestions whenever 2+ chars AND not selected
  const showSuggest = debounced.trim().length >= 2 && !row.selectedId;

  // filter suggestions — refine as user types more
  const suggestions = useMemo(() => {
    if (!showSuggest) return [];
    const q = debounced.trim().toLowerCase();
    return allIngredients
      .filter((i) => (i.name || "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [allIngredients, debounced, showSuggest]);

  // keep input in sync if changed externally
  useEffect(() => {
    if (row.name !== query) setQuery(row.name || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.name]);

  // open/close suggestions menu (slightly raised by 2px)
  useEffect(() => {
    if (showSuggest && suggestions.length > 0 && nameAnchorRef.current) {
      nameAnchorRef.current.measureInWindow((x, y, w, h) => {
        setSuggestMenu({
          visible: true,
          anchor: { x, y: y + h - 2 },
          width: w,
        });
      });
    } else if (
      suggestMenu.visible &&
      (!showSuggest || suggestions.length === 0)
    ) {
      setSuggestMenu((m) => ({ ...m, visible: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuggest, suggestions.length]);

  // Auto-bind selection if exact match (case/accents-insensitive)
  useEffect(() => {
    const raw = query;
    const stable = debounced;
    if (!raw || row.selectedId) return;
    if (raw !== stable) return; // user still typing
    if (raw.trim() !== raw) return; // leading/trailing space
    const match = allIngredients.find(
      (i) => collator.compare((i.name || "").trim(), raw.trim()) === 0
    );
    if (match) {
      onChange({ selectedId: match.id, selectedItem: match });
    }
  }, [query, debounced, row.selectedId, allIngredients, collator, onChange]);

  const selectedUnit = getUnitById(row.unitId) || getUnitById(UNIT_ID.ML);

  // exact match check for showing [+]
  const hasExactMatch = useMemo(() => {
    const t = query.trim();
    if (!t) return true;
    return allIngredients.some(
      (i) => collator.compare((i.name || "").trim(), t) === 0
    );
  }, [allIngredients, collator, query]);

  const showAddNewBtn =
    !row.selectedId && query.trim().length > 0 && !hasExactMatch;

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
      {/* Header: index + remove */}
      <View style={styles.ingHeader}>
        <Text style={{ fontWeight: "700", color: theme.colors.onSurface }}>
          {index + 1}.
        </Text>
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
      </View>

      {/* Ingredient label + [+] */}
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: theme.colors.onSurface }]}>
          Ingredient
        </Text>

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
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Name (anchored) */}
      <View ref={nameAnchorRef} collapsable={false}>
        <TextInput
          placeholder="Type ingredient name"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            onChange({ name: t, selectedId: null, selectedItem: null });
          }}
          style={[
            styles.input,
            {
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.background,
            },
          ]}
          returnKeyType="done"
        />
      </View>

      {/* Amount + Unit */}
      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Amount
          </Text>
          <TextInput
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

        <View ref={unitAnchorRef} collapsable={false} style={{ width: 140 }}>
          <Text style={[styles.label, { color: theme.colors.onSurface }]}>
            Unit
          </Text>
          <Pressable
            onPress={() => onOpenUnitPicker(unitAnchorRef)}
            android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
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
              {selectedUnit?.name || "ml"}
            </Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
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
        {row.selectedItem?.baseIngredientId
          ? checkbox(row.allowBaseFallback, "Allow base fallback", () =>
              onChange({ allowBaseFallback: !row.allowBaseFallback })
            )
          : null}
      </View>

      {/* Substitute button (stub) */}
      <Pressable
        onPress={() => {}}
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

      {/* Suggestions dropdown (anchored) */}
      <IngredientSuggestMenu
        visible={suggestMenu.visible}
        anchor={suggestMenu.anchor}
        anchorWidth={suggestMenu.width}
        items={suggestions}
        onSelect={(item) => {
          onChange({
            name: item.name,
            selectedId: item.id,
            selectedItem: item,
          });
          setQuery(item.name);
        }}
        onDismiss={() => setSuggestMenu((m) => ({ ...m, visible: false }))}
      />
    </View>
  );
});

/* ---------- Screen ---------- */
export default function AddCocktailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // base fields
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [tags, setTags] = useState([]);
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  // ingredients list
  const [ings, setIngs] = useState([
    {
      localId: Date.now(),
      name: "",
      selectedId: null,
      selectedItem: null,
      quantity: "",
      unitId: UNIT_ID.ML,
      garnish: false,
      optional: false,
      allowBaseFallback: false,
      substitutes: [],
    },
  ]);

  // unit anchored menu state
  const [unitMenu, setUnitMenu] = useState({
    visible: false,
    forLocalId: null,
    anchor: null, // { x, y }
    width: 0,
  });

  // ingredients for suggestions
  const [allIngredients, setAllIngredients] = useState([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const list = await getAllIngredients();
      if (!cancel) setAllIngredients(list);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const availableTags = BUILTIN_COCKTAIL_TAGS;

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
        allowBaseFallback: false,
        substitutes: [],
      },
    ]);
  }, []);

  const openUnitMenu = useCallback((anchorRef, localId) => {
    if (!anchorRef?.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      setUnitMenu({
        visible: true,
        forLocalId: localId,
        anchor: { x, y: y + h },
        width: w,
      });
    });
  }, []);

  const closeUnitMenu = useCallback(
    () => setUnitMenu((m) => ({ ...m, visible: false })),
    []
  );

  // OPEN AddIngredient with prefilled name; return result via params (serializable)
  const openAddIngredient = useCallback(
    (initialName, localId) => {
      navigation.navigate("Ingredients", {
        screen: "Create",
        params: {
          screen: "AddIngredient",
          params: {
            initialName, // ← тут обов'язково передати
            targetLocalId: localId,
            returnTo: "AddCocktail",
          },
        },
      });
    },
    [navigation]
  );

  // Catch created ingredient returned from AddIngredient (serializable)
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

      // clear params so it won't re-apply on next focus
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
      ingredients: nonEmptyIngredients.map((r, idx) => ({
        order: idx + 1,
        ingredientId: r.selectedId,
        name: r.name.trim(),
        quantity: r.quantity.trim(),
        unitId: r.unitId,
        garnish: !!r.garnish,
        optional: !!r.optional,
        allowBaseFallback: !!r.allowBaseFallback,
        substitutes: r.substitutes || [],
      })),
      createdAt: Date.now(),
    };

    await addCocktail(cocktail);
    navigation.navigate("CocktailDetails", { id: cocktail.id });
  }, [name, photoUri, tags, description, instructions, ings, navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Name */}
      <Text style={[styles.label, { color: theme.colors.onBackground }]}>
        Name
      </Text>
      <TextInput
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

      {/* Photo */}
      <Text style={[styles.label, { color: theme.colors.onBackground }]}>
        Photo
      </Text>
      <Pressable
        onPress={pickImage}
        android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
        style={[
          styles.photoBtn,
          {
            borderColor: theme.colors.outline,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Tap to select image
          </Text>
        )}
      </Pressable>

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
        {BUILTIN_COCKTAIL_TAGS.filter(
          (t) => !tags.some((x) => x.id === t.id)
        ).map((t) => (
          <TagPill
            key={t.id}
            id={t.id}
            name={t.name}
            color={t.color}
            onToggle={toggleTagById}
          />
        ))}
      </View>

      {/* Description */}
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
        placeholder="Steps to prepare the cocktail"
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
        <IngredientRow
          key={row.localId}
          index={idx}
          row={row}
          allIngredients={allIngredients}
          onChange={(patch) => updateRow(row.localId, patch)}
          onRemove={() => removeRow(row.localId)}
          onOpenUnitPicker={(anchorRef) => openUnitMenu(anchorRef, row.localId)}
          onAddNewIngredient={(nm) => openAddIngredient(nm, row.localId)}
        />
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

      {/* Unit anchored menu */}
      <UnitPicker
        visible={unitMenu.visible}
        anchor={unitMenu.anchor}
        anchorWidth={unitMenu.width}
        value={
          unitMenu.forLocalId != null
            ? ings.find((r) => r.localId === unitMenu.forLocalId)?.unitId ??
              UNIT_ID.ML
            : UNIT_ID.ML
        }
        onSelect={(unitId) => {
          if (unitMenu.forLocalId == null) return;
          updateRow(unitMenu.forLocalId, { unitId });
        }}
        onDismiss={closeUnitMenu}
      />
    </ScrollView>
  );
}

/* ---------- styles ---------- */
const IMAGE_SIZE = 150;

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  label: { fontWeight: "bold", marginTop: 16 },

  // special for Ingredient + [+]
  labelRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelText: { fontWeight: "bold" },
  addInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginTop: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },

  photoBtn: {
    marginTop: 8,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  photo: { width: IMAGE_SIZE, height: IMAGE_SIZE, resizeMode: "cover" },

  tagContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: { color: "white", fontWeight: "bold" },

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
  removeBtn: { padding: 4 },

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
  },

  saveBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
