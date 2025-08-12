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
  Dimensions,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useTheme, Menu, Divider, Portal } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

import { getAllIngredients } from "../../storage/ingredientsStorage";
import { addCocktail } from "../../storage/cocktailsStorage";
import { BUILTIN_COCKTAIL_TAGS } from "../../constants/cocktailTags";
import UnitPicker from "../../components/UnitPicker";
import { UNIT_ID, getUnitById } from "../../constants/measureUnits";
import { GLASSWARE, getGlassById } from "../../constants/glassware";

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
// розбиваємо на слова: латиниця + цифри + кирилиця (U+0400..U+04FF)
const WORD_SPLIT_RE = /[^a-z0-9\u0400-\u04FF]+/i;
const wordPrefixMatch = (name, query) => {
  const n = normalizeUk(name);
  const q = normalizeUk(query).trim();
  if (!q) return false;
  const words = n.split(WORD_SPLIT_RE).filter(Boolean);
  return words.some((w) => w.startsWith(q));
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

/* ---------- Ingredient suggestions dropdown (як базові/брендовані, без пошуку) ---------- */
const SUGGEST_ROW_H = 56; // візуальний паритет з іншим меню

const IngredientSuggestMenu = memo(function IngredientSuggestMenu({
  visible,
  anchor, // {x,y} — точка під інпутом
  anchorWidth, // ширина інпуту
  items,
  menuKey,
  maxHeight, // динамічна межа висоти щоб не flip-илось вгору
  anchorPosition,
  onSelect,
  onDismiss,
}) {
  const theme = useTheme();
  if (!visible || !items?.length) return null; // ← не рендеримо порожнє меню
  const height =
    typeof maxHeight === "number"
      ? Math.min(maxHeight, SUGGEST_ROW_H * items.length)
      : Math.min(300, SUGGEST_ROW_H * items.length);

  return (
    <Portal>
      <Menu
        key={menuKey}
        visible={visible}
        onDismiss={onDismiss}
        anchor={anchor || { x: 0, y: 0 }}
        anchorPosition={anchorPosition || "bottom"}
        contentStyle={{
          width: anchorWidth || 260,
          backgroundColor: theme.colors.surface,
        }}
        style={{}} // без transform — працюємо координатним якорем
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
                {/* 4px stripe для branded — як у головному меню */}
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
            height,
          }}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, i) => ({
            length: SUGGEST_ROW_H,
            offset: SUGGEST_ROW_H * i,
            index: i,
          })}
        />
      </Menu>
    </Portal>
  );
});

/* ---------- GlasswareMenu (no search) ---------- */
const GLASS_ROW_H = 56;
const GLASS_MENU_W = 249; // фіксована ширина меню склянок

const GlasswareMenu = memo(function GlasswareMenu({
  visible,
  anchor, // {x, y} — ЛІВИЙ край меню
  onSelect,
  onDismiss,
}) {
  const theme = useTheme();
  return (
    <Portal>
      <Menu
        visible={visible}
        onDismiss={onDismiss}
        anchor={anchor || { x: 0, y: 0 }}
        contentStyle={{
          width: GLASS_MENU_W,
          backgroundColor: theme.colors.surface,
        }}
      >
        <FlatList
          data={GLASSWARE}
          keyExtractor={(g) => g.id}
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
                    height: GLASS_ROW_H,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  },
                  pressed && { opacity: 0.96 },
                ]}
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
              </Pressable>
            </>
          )}
          style={{
            height: Math.min(360, GLASS_ROW_H * GLASSWARE.length),
          }}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, i) => ({
            length: GLASS_ROW_H,
            offset: GLASS_ROW_H * i,
            index: i,
          })}
        />
      </Menu>
    </Portal>
  );
});

/* ---------- IngredientRow ---------- */
const IngredientRow = memo(function IngredientRow({
  index,
  row,
  onChange,
  onRemove,
  onOpenUnitPicker,
  allIngredients,
  onAddNewIngredient,
}) {
  const MIN_CHARS = 2;
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

  // keyboard height (щоб не перевертати меню наверх)
  const [kbHeight, setKbHeight] = useState(0);
  const [menuKey, setMenuKey] = useState(0); // змінюємо щоб ремоунтити Menu
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

  // anchored suggest state
  const [suggestMenu, setSuggestMenu] = useState({
    visible: false,
    anchor: null,
    width: 0,
    maxHeight: 0,
    anchorPosition: "bottom", // "bottom" | "top"
  });

  // 🔹 пам'ятаємо, для якого запиту було відкрите меню
  const [openedFor, setOpenedFor] = useState(null);

  // show suggestions whenever 2+ chars AND not selected
  const showSuggest = debounced.trim().length >= MIN_CHARS && !row.selectedId;

  // filter suggestions (пошук тільки за префіксом слова)
  const suggestions = useMemo(() => {
    if (!showSuggest) return [];
    const q = debounced.trim();
    if (!q) return [];
    return allIngredients
      .filter((i) => wordPrefixMatch(i.name || "", q))
      .slice(0, 20);
  }, [allIngredients, debounced, showSuggest]);

  // keep input in sync if changed externally
  useEffect(() => {
    if (row.name !== query) setQuery(row.name || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.name]);

  // утиліта: порахувати позицію + максимально допустиму висоту
  const recalcMenu = useCallback(
    (openIfHidden = false) => {
      if (!nameAnchorRef.current) return;
      nameAnchorRef.current.measureInWindow((x, y, w, h) => {
        const screenH = Dimensions.get("window").height;
        const SAFE = 12;
        const DOWN_Y = 28; // невеличке «притискання» до поля
        const TOP_Y = 13; // невеличке «притискання» до поля

        // простір над та під полем
        const spaceAbove = Math.max(0, y - SAFE);
        const bottomEdge = y + h;
        const spaceBelow = Math.max(0, screenH - kbHeight - bottomEdge - SAFE);

        // скільки потрібно для всіх елементів (потім обмежимо)
        const needed =
          SUGGEST_ROW_H * Math.max(1, Math.min(suggestions.length, 5) || 1);
        console.log(needed);
        // вибираємо напрямок: де більше простору — там і відкривати
        const openDown = spaceBelow >= spaceAbove;
        const maxFit = Math.min(
          300,
          Math.max(SUGGEST_ROW_H, openDown ? spaceBelow : spaceAbove)
        );

        // якір: для "bottom" — лівий-нижній кут поля, для "top" — лівий-верхній
        const anchorX = x;

        const anchorY = openDown ? bottomEdge + DOWN_Y : y + TOP_Y - needed;

        setSuggestMenu((m) => ({
          ...m,
          visible: openIfHidden ? true : m.visible,
          anchor: { x: anchorX, y: anchorY },
          width: w,
          maxHeight: Math.min(needed, maxFit),
          anchorPosition: openDown ? "bottom" : "top",
        }));
      });
    },
    [kbHeight, suggestions.length]
  );

  // 🔹 закриття меню запам'ятовує поточний запит, щоб не відкривати одразу знову
  const handleDismissSuggest = useCallback(() => {
    setSuggestMenu((m) => ({ ...m, visible: false }));
    setOpenedFor(debounced);
  }, [debounced]);

  // якщо користувач очистив до < MIN_CHARS — дозволяємо авто-відкриття знову
  useEffect(() => {
    if (debounced.trim().length < MIN_CHARS) {
      setOpenedFor(null);
    }
  }, [debounced]);

  // open/close + ремірка (відкривати лише коли змінився текст у полі)
  useEffect(() => {
    if (showSuggest && suggestions.length > 0) {
      if (suggestMenu.visible) {
        recalcMenu(); // оновити позицію/висоту без пере-монту
      } else if (openedFor !== debounced) {
        setSuggestMenu((m) => ({ ...m, visible: true }));
        setOpenedFor(debounced);
        recalcMenu(true); // відкрити і одразу порахувати позицію
      }
    } else {
      if (suggestMenu.visible)
        setSuggestMenu((m) => ({ ...m, visible: false }));
    }
  }, [
    showSuggest,
    suggestions.length,
    debounced,
    openedFor,
    suggestMenu.visible,
    recalcMenu,
  ]);

  // додатково — кожна зміна введення (навіть якщо length не змінився)
  useEffect(() => {
    if (suggestMenu.visible) recalcMenu();
  }, [debounced, recalcMenu, suggestMenu.visible]);

  // ремірка при зміні розмірів (обертання тощо)
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", () => {
      if (suggestMenu.visible) recalcMenu();
    });
    return () => sub?.remove?.();
  }, [suggestMenu.visible, recalcMenu]);

  // Auto-bind selection if exact match
  useEffect(() => {
    const raw = query;
    const stable = debounced;
    if (!raw || row.selectedId) return;
    if (raw !== stable) return;
    if (raw.trim() !== raw) return;
    const match = allIngredients.find(
      (i) => collator.compare((i.name || "").trim(), raw.trim()) === 0
    );
    if (match) {
      onChange({ selectedId: match.id, selectedItem: match });
    }
  }, [query, debounced, row.selectedId, allIngredients, collator, onChange]);

  const selectedUnit = getUnitById(row.unitId) || getUnitById(UNIT_ID.ML);

  // exact match check for showing [+] — >1 символа
  const hasExactMatch = useMemo(() => {
    const t = query.trim();
    if (!t) return true;
    return allIngredients.some(
      (i) => collator.compare((i.name || "").trim(), t) === 0
    );
  }, [allIngredients, collator, query]);

  const showAddNewBtn =
    !row.selectedId && query.trim().length > 1 && !hasExactMatch;

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

      {/* Ingredient */}
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: theme.colors.onSurface }]}>
          Ingredient
        </Text>
      </View>

      {/* Name input + inline [+Add] in one row */}
      <View style={styles.inputRow}>
        <View
          ref={nameAnchorRef}
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={() => {
            if (suggestMenu.visible) recalcMenu();
          }}
        >
          <TextInput
            placeholder="Type ingredient name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              onChange({ name: t, selectedId: null, selectedItem: null });
              if (t.trim().length < MIN_CHARS) {
                setSuggestMenu((m) => ({ ...m, visible: false }));
              }
            }}
            style={[
              styles.input,
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
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              Add
            </Text>
          </Pressable>
        ) : null}
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
        anchorPosition={suggestMenu.anchorPosition}
        items={suggestions}
        maxHeight={suggestMenu.maxHeight}
        onSelect={(item) => {
          onChange({
            name: item.name,
            selectedId: item.id,
            selectedItem: item,
          });
          setQuery(item.name);
        }}
        onDismiss={handleDismissSuggest}
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
  const [glassId, setGlassId] = useState("cocktail_glass");

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

  // glass anchored menu state (вирівняно по правому краю)
  const [glassMenu, setGlassMenu] = useState({
    visible: false,
    anchor: null, // { x: leftOfMenu, y: top }
  });
  const glassAnchorRef = useRef(null);

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

  // open glass menu — рахуємо ЛІВИЙ край меню, щоб змістити вліво на GLASS_MENU_W
  const openGlassMenu = useCallback(() => {
    if (!glassAnchorRef.current) return;
    const { width: winW } = Dimensions.get("window");

    glassAnchorRef.current.measureInWindow((x, y, w, h) => {
      const rightX = x + w;
      // лівий край меню = правий край кнопки - ширина меню
      let leftX = rightX - GLASS_MENU_W;

      // відступи від країв екрана
      const PADDING = 8;
      if (leftX < PADDING) leftX = PADDING;
      const maxLeft = winW - PADDING - GLASS_MENU_W;
      if (leftX > maxLeft) leftX = maxLeft;

      setGlassMenu({
        visible: true,
        anchor: { x: leftX, y: y + h },
      });
    });
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
            initialName,
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
      glassId,
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
  }, [
    name,
    photoUri,
    tags,
    description,
    instructions,
    glassId,
    ings,
    navigation,
  ]);

  const selectedGlass = getGlassById(glassId) || { name: "Cocktail glass" };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      onScrollBeginDrag={() => Keyboard.dismiss()}
      keyboardShouldPersistTaps="handled"
      onTouchStart={() => {
        if (glassMenu.visible) {
          setGlassMenu((m) => ({ ...m, visible: false }));
        }
      }}
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

      {/* Photo + Glass in one row */}
      <View style={styles.mediaRow}>
        {/* Photo */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Photo
          </Text>
          <Pressable
            onPress={pickImage}
            android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
            style={[
              styles.mediaSquare,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.mediaImg} />
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Tap to select image
              </Text>
            )}
          </Pressable>
        </View>

        {/* Glass */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.colors.onBackground }]}>
            Glass
          </Text>

          <View ref={glassAnchorRef} collapsable={false}>
            <Pressable
              onPress={openGlassMenu}
              android_ripple={{ color: withAlpha(theme.colors.tertiary, 0.2) }}
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
            </Pressable>
          </View>

          {/* Glass menu (left-shifted by fixed width) */}
          <GlasswareMenu
            visible={glassMenu.visible}
            anchor={glassMenu.anchor}
            onSelect={(g) => setGlassId(g.id)}
            onDismiss={() => setGlassMenu((m) => ({ ...m, visible: false }))}
          />
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

  // input + inline add in one row
  inputRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginTop: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },

  // media row: photo + glass
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
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaImg: { width: IMAGE_SIZE, height: IMAGE_SIZE, resizeMode: "cover" },

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

  addInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
