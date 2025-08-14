import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  BackHandler,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import {
  getIngredientById,
  getAllIngredients,
  saveIngredient,
} from "../../storage/ingredientsStorage";
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { mapCocktailsByIngredient } from "../../utils/ingredientUsage";
import { MaterialIcons } from "@expo/vector-icons";
import CocktailRow from "../../components/CocktailRow";
import { useTabMemory } from "../../context/TabMemoryContext";
import { useTheme } from "react-native-paper";

const PHOTO_SIZE = 200;
const THUMB = 40;

/** Gray-square photo (no icon/initials), uses theme */
const PhotoThumb = memo(function PhotoThumb({ uri }) {
  const theme = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.thumb, { backgroundColor: theme.colors.surface }]}
      />
    );
  }
  return (
    <View style={[styles.thumb, { backgroundColor: theme.colors.surface }]} />
  );
});

/** One relation row (child or base), uses theme */
const RelationRow = memo(function RelationRow({
  name,
  photoUri,
  onOpen,
  onUnlink,
  unlinkLabel = "Unlink",
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={onOpen}
        activeOpacity={0.7}
      >
        <PhotoThumb uri={photoUri} />
        <Text style={[styles.rowText, { color: theme.colors.onSurface }]}>
          {name}
        </Text>
      </TouchableOpacity>

      {onUnlink && (
        <TouchableOpacity
          onPress={onUnlink}
          style={styles.unlinkBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={unlinkLabel}
        >
          <MaterialIcons name="link-off" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      )}

      <MaterialIcons
        name="chevron-right"
        size={20}
        color={theme.colors.onSurfaceVariant}
      />
    </View>
  );
});

export default function IngredientDetailsScreen() {
  const navigation = useNavigation();
  const { id, fromCocktailId } = useRoute().params;
  const theme = useTheme();

  const [ingredient, setIngredient] = useState(null);
  const [brandedChildren, setBrandedChildren] = useState([]);
  const [baseIngredient, setBaseIngredient] = useState(null);
  const [usedCocktails, setUsedCocktails] = useState([]);

  const collator = useMemo(
    () => new Intl.Collator("uk", { sensitivity: "base" }),
    []
  );

  const { getTab } = useTabMemory();
  const previousTab = getTab("ingredients");

  const handleGoBack = useCallback(() => {
    if (fromCocktailId)
      navigation.navigate("Cocktails", {
        screen: "Create",
        params: { screen: "CocktailDetails", params: { id: fromCocktailId } },
      });
    else if (previousTab) navigation.navigate(previousTab);
    else navigation.goBack();
  }, [navigation, previousTab, fromCocktailId]);

  const handleEdit = useCallback(() => {
    navigation.navigate("EditIngredient", { id });
  }, [navigation, id]);

  // Always show custom back button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons
            name={Platform.OS === "ios" ? "arrow-back-ios" : "arrow-back"}
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleEdit}
          style={styles.headerEditBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Edit"
        >
          <MaterialIcons
            name="edit"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      ),
    });
  }, [
    navigation,
    handleGoBack,
    handleEdit,
    theme.colors.onSurface,
  ]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (
        e.data.action.type === "NAVIGATE" ||
        (!fromCocktailId && !previousTab)
      )
        return;
      e.preventDefault();
      handleGoBack();
    });
    return unsub;
  }, [navigation, handleGoBack, fromCocktailId, previousTab]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        handleGoBack();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [handleGoBack])
  );

  const load = useCallback(async () => {
    const [loaded, all, cocktails] = await Promise.all([
      getIngredientById(id),
      getAllIngredients(),
      getAllCocktails(),
    ]);
    setIngredient(loaded || null);

    if (!loaded) {
      setBrandedChildren([]);
      setBaseIngredient(null);
      setUsedCocktails([]);
      return;
    }

    const children = all
      .filter((i) => i.baseIngredientId === loaded.id)
      .sort((a, b) => collator.compare(a.name, b.name));
    setBrandedChildren(children);

    const base =
      loaded.baseIngredientId != null
        ? all.find((i) => i.id === loaded.baseIngredientId)
        : null;
    setBaseIngredient(base || null);

    const map = mapCocktailsByIngredient(all, cocktails);
    const byId = new Map(cocktails.map((c) => [c.id, c]));
    const ingMap = new Map(all.map((i) => [String(i.id), i]));
    const list = (map[loaded.id] || [])
      .map((cid) => byId.get(cid))
      .filter(Boolean)
      .sort((a, b) => collator.compare(a.name, b.name))
      .map((c) => {
        const required = (c.ingredients || []).filter((r) => !r.optional);
        const missing = [];
        let allAvail = required.length > 0;
        for (const r of required) {
          const ing = ingMap.get(String(r.ingredientId));
          let isAvailable = false;
          if (ing?.inBar) {
            isAvailable = true;
          } else if (ing) {
            const baseId = String(ing.baseIngredientId ?? ing.id);
            if (!isAvailable && r.allowBaseSubstitution) {
              const base = ingMap.get(baseId);
              if (base?.inBar) isAvailable = true;
            }
            if (!isAvailable && r.allowBrandedSubstitutes) {
              const brand = all.find(
                (i) => i.inBar && String(i.baseIngredientId) === baseId
              );
              if (brand) isAvailable = true;
            }
          }
          if (!isAvailable && Array.isArray(r.substitutes)) {
            for (const s of r.substitutes) {
              const candidate = ingMap.get(String(s.id));
              if (candidate?.inBar) {
                isAvailable = true;
                break;
              }
            }
          }
          if (!isAvailable) {
            if (ing?.name) missing.push(ing.name);
            allAvail = false;
          }
        }
        const branded = (c.ingredients || []).some((r) => {
          const ing = ingMap.get(String(r.ingredientId));
          return ing && ing.baseIngredientId != null;
        });
        const ingredientNames = (c.ingredients || [])
          .map((r) => ingMap.get(String(r.ingredientId))?.name)
          .filter(Boolean);
        let ingredientLine = ingredientNames.join(", ");
        if (!allAvail) {
          if (missing.length > 0 && missing.length <= 2) {
            ingredientLine = `Missing: ${missing.join(", ")}`;
          } else if (missing.length >= 3) {
            ingredientLine = `Missing: ${missing.length} ingredients`;
          }
        }
        return {
          ...c,
          isAllAvailable: allAvail,
          hasBranded: branded,
          ingredientLine,
        };
      });
    setUsedCocktails(list);
  }, [id, collator]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (!cancelled) await load();
        } catch {}
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const toggleInBar = useCallback(() => {
    setIngredient((prev) => {
      if (!prev) return prev;
      const next = { ...prev, inBar: !prev.inBar };
      saveIngredient(next);
      return next;
    });
  }, []);

  const toggleInShoppingList = useCallback(() => {
    setIngredient((prev) => {
      if (!prev) return prev;
      const next = { ...prev, inShoppingList: !prev.inShoppingList };
      saveIngredient(next);
      return next;
    });
  }, []);

  const unlinkFromBase = useCallback(() => {
    if (ingredient?.baseIngredientId == null) return;
    Alert.alert("Unlink", "Remove link to base ingredient?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          const updated = { ...ingredient, baseIngredientId: null };
          await saveIngredient(updated);
          setIngredient(updated);
          setBaseIngredient(null);
        },
      },
    ]);
  }, [ingredient]);

  const unlinkChild = useCallback((child) => {
    Alert.alert(
      "Unlink",
      `Remove link for "${child.name}" from this base ingredient?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            const updatedChild = { ...child, baseIngredientId: null };
            await saveIngredient(updatedChild);
            setBrandedChildren((prev) => prev.filter((c) => c.id !== child.id));
          },
        },
      ]
    );
  }, []);

  const goToIngredient = useCallback(
    (goId) => {
      navigation.push("IngredientDetails", { id: goId });
    },
    [navigation]
  );

  const goToCocktail = useCallback(
    (goId) => {
      navigation.navigate("Cocktails", {
        screen: "Create",
        params: { screen: "CocktailDetails", params: { id: goId } },
      });
    },
    [navigation]
  );

  if (!ingredient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.onSurface }}>
          Loading ingredient...
        </Text>
      </View>
    );
  }

  const isBase = brandedChildren.length > 0;
  const isBranded = ingredient.baseIngredientId != null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {ingredient.name}
      </Text>

      {ingredient.photoUri ? (
        <Image
          source={{ uri: ingredient.photoUri }}
          style={styles.photo}
          resizeMode="contain"
        />
      ) : (
        <View
          style={[
            styles.photo,
            {
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No image</Text>
        </View>
      )}

      <View style={styles.iconRow}>
        <TouchableOpacity
          onPress={toggleInShoppingList}
          style={styles.iconButton}
        >
          <MaterialIcons
            name={
              ingredient.inShoppingList ? "shopping-cart" : "add-shopping-cart"
            }
            size={24}
            color={
              ingredient.inShoppingList
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleInBar} style={styles.iconButton}>
          <MaterialIcons
            name={ingredient.inBar ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={
              ingredient.inBar
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
        </TouchableOpacity>
      </View>

      {Array.isArray(ingredient.tags) && ingredient.tags.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
          >
            Tags:
          </Text>
          <View style={styles.tagRow}>
            {ingredient.tags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tag, { backgroundColor: tag.color }]}
              >
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        {isBase ? (
          <>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
            >
              Branded ingredients:
            </Text>
            <View
              style={[styles.listBox, { borderColor: theme.colors.outline }]}
            >
              {brandedChildren.map((child, idx) => (
                <View key={child.id}>
                  <RelationRow
                    name={child.name}
                    photoUri={child.photoUri}
                    onOpen={() => goToIngredient(child.id)}
                    onUnlink={() => unlinkChild(child)}
                    unlinkLabel={`Unlink ${child.name}`}
                  />
                  {idx !== brandedChildren.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.colors.outlineVariant },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>
          </>
        ) : isBranded && baseIngredient ? (
          <>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
            >
              Base ingredient:
            </Text>
            <View
              style={[styles.singleRow, { borderColor: theme.colors.outline }]}
            >
              <RelationRow
                name={baseIngredient.name}
                photoUri={baseIngredient.photoUri}
                onOpen={() => goToIngredient(baseIngredient.id)}
                onUnlink={unlinkFromBase}
                unlinkLabel="Unlink from base ingredient"
              />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
          Used in cocktails:
        </Text>
        {usedCocktails.length > 0 ? (
          <View style={{ marginHorizontal: -24 }}>
            {usedCocktails.map((c) => (
              <CocktailRow
                key={c.id}
                id={c.id}
                name={c.name}
                photoUri={c.photoUri}
                glassId={c.glassId}
                tags={c.tags}
                ingredientLine={c.ingredientLine}
                rating={c.rating}
                isAllAvailable={c.isAllAvailable}
                hasBranded={c.hasBranded}
                onPress={goToCocktail}
              />
            ))}
          </View>
        ) : (
          <Text
            style={{
              fontStyle: "italic",
              color: theme.colors.onSurfaceVariant,
            }}
          >
            No cocktails yet
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.addCocktailButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={() =>
          navigation.navigate("Cocktails", {
            screen: "Create",
            params: {
              screen: "AddCocktail",
              params: { initialIngredient: ingredient },
            },
          })
        }
      >
        <Text
          style={[styles.addCocktailText, { color: theme.colors.onPrimary }]}
        >
          + Add Cocktail
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 24 }, // bg is set via theme inline
  title: { fontSize: 22, fontWeight: "bold" },

  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    aspectRatio: 1,
    marginTop: 12,
    alignSelf: "center",
  },

  section: { marginTop: 16 },
  sectionLabel: { fontWeight: "bold", marginBottom: 8 },

  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "white", fontWeight: "bold" },

  listBox: { borderWidth: 1, borderRadius: 8 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rowMain: { flexDirection: "row", alignItems: "center", flex: 1 },
  singleRow: { borderWidth: 1, borderRadius: 8 },

  thumb: {
    width: THUMB,
    height: THUMB,
    aspectRatio: 1,
    borderRadius: 8,
    marginRight: 10,
  },
  thumbPlaceholder: {},

  rowText: { flex: 1, fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 8 + THUMB + 10 },

  unlinkBtn: { paddingHorizontal: 6, paddingVertical: 4, marginRight: 4 },

  addCocktailButton: {
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addCocktailText: { fontWeight: "bold" },

  iconRow: {
    flexDirection: "row",
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 12,
  },
  iconButton: { marginLeft: 12, padding: 4 },

  headerBackBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerEditBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});
