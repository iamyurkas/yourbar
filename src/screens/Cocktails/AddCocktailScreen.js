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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
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

/* ---------- SuggestionRow (ingredient search) ---------- */
const SuggestionRow = memo(function SuggestionRow({ item, onSelect }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(item)}
      android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
      style={({ pressed }) => [
        styles.suggestRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.suggestLeft}>
        {item.photoUri ? (
          <Image
            source={{ uri: item.photoUri }}
            style={[
              styles.suggestThumb,
              { backgroundColor: theme.colors.background },
            ]}
          />
        ) : (
          <View
            style={[
              styles.suggestThumb,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        )}
        <Text style={{ color: theme.colors.onSurface }} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      {item.baseIngredientId ? (
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          branded
        </Text>
      ) : null}
    </Pressable>
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
}) {
  const theme = useTheme();
  const [query, setQuery] = useState(row.name || "");
  const debounced = useDebounced(query, 200);
  const showSuggest = debounced.trim().length >= 2 && !row.selectedId;
  const unitAnchorRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!showSuggest) return [];
    const q = debounced.trim().toLowerCase();
    const list = allIngredients.filter((i) =>
      (i.name || "").toLowerCase().includes(q)
    );
    return list.slice(0, 12);
  }, [allIngredients, debounced, showSuggest]);

  useEffect(() => {
    if (row.name !== query) setQuery(row.name || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.name]);

  const selectedUnit = getUnitById(row.unitId) || getUnitById(UNIT_ID.ML);

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

      {/* Name + suggestions */}
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        Ingredient
      </Text>
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

      {showSuggest && suggestions.length > 0 ? (
        <View
          style={[
            styles.suggestBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              item={s}
              onSelect={(item) => {
                onChange({
                  name: item.name,
                  selectedId: item.id,
                  selectedItem: item,
                });
              }}
            />
          ))}
        </View>
      ) : null}

      {/* Quantity + Unit */}
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
    </View>
  );
});

/* ---------- Screen ---------- */
export default function AddCocktailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

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

  // suggestions dropdown
  suggestBox: {
    borderWidth: 1,
    borderTopWidth: 0, // щоб не було подвійного бордера
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -2, // піднімаємо на 2px
    overflow: "hidden",
    maxHeight: 220,
  },
  suggestRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  suggestLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  suggestThumb: { width: 32, height: 32, borderRadius: 6 },

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
