import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useCallback,
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
  BackHandler,
  InteractionManager,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  CommonActions,
} from "@react-navigation/native";
import { goBack } from "../../utils/navigation";

import {
  getAllIngredients,
  saveIngredient,
  updateIngredientById,
  updateIngredientFields,
} from "../../storage/ingredientsStorage";
import db from "../../storage/sqlite";

import { getAllCocktails } from "../../storage/cocktailsStorage";
import { mapCocktailsByIngredient } from "../../utils/ingredientUsage";
import { sortByName } from "../../utils/sortByName";
import { MaterialIcons } from "@expo/vector-icons";
import CocktailRow from "../../components/CocktailRow";
import { useTheme } from "react-native-paper";
import {
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../storage/settingsStorage";
import useIngredientsData from "../../hooks/useIngredientsData";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import ExpandableText from "../../components/ExpandableText";

const PHOTO_SIZE = 150;
const THUMB = 40;

function buildDetails(all, cocktails, loaded, ig = true, allowSubs = true) {
  if (!loaded) return { children: [], base: null, used: [] };
  const children = all
    .filter((i) => i.baseIngredientId === loaded.id)
    .sort(sortByName);
  const baseId = loaded.baseIngredientId;
  const base =
    baseId != null ? all.find((i) => i.id === baseId) || null : null;
  const map = mapCocktailsByIngredient(all, cocktails, {
    allowSubstitutes: allowSubs,
  });
  const byId = new Map(cocktails.map((c) => [c.id, c]));
  const ingMap = new Map(all.map((i) => [String(i.id), i]));
  const findBrand = (bId) =>
    all.find((i) => i.inBar && String(i.baseIngredientId) === String(bId));
  const list = (map[loaded.id] || [])
    .map((cid) => byId.get(cid))
    .filter(Boolean)
    .sort(sortByName)
    .map((c) => {
      const required = (c.ingredients || []).filter(
        (r) => !r.optional && !(ig && r.garnish)
      );
      const missing = [];
      const ingredientNames = [];
      let allAvail = required.length > 0;
      let branded = false;
      for (const r of required) {
        const ing = ingMap.get(String(r.ingredientId));
        const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
        let used = null;
        if (ing?.inBar) {
          used = ing;
        } else {
          if (allowSubs || r.allowBaseSubstitution) {
            const base = ingMap.get(baseId);
            if (base?.inBar) used = base;
          }
          const isBase = ing?.baseIngredientId == null;
          if (!used && (allowSubs || r.allowBrandedSubstitutes || isBase)) {
            const brand = findBrand(baseId);
            if (brand) used = brand;
          }
          if (!used && Array.isArray(r.substitutes)) {
            for (const s of r.substitutes) {
              const candidate = ingMap.get(String(s.id));
              if (candidate?.inBar) {
                used = candidate;
                break;
              }
            }
          }
        }
        if (used) {
          ingredientNames.push(used.name);
          if (used.baseIngredientId != null) branded = true;
        } else {
          if (ing?.baseIngredientId != null) branded = true;
          const missingName = ing?.name || r.name || "";
          if (missingName) missing.push(missingName);
          allAvail = false;
        }
      }
      let ingredientLine = ingredientNames.join(", ");
      if (!allAvail) {
        if (missing.length > 0 && missing.length <= 2) {
          ingredientLine = `Missing: ${missing.join(", ")}`;
        } else if (missing.length >= 3 || missing.length === 0) {
          ingredientLine = `Missing: ${
            missing.length || required.length
          } ingredients`;
        }
      }
      return {
        ...c,
        isAllAvailable: allAvail,
        hasBranded: branded,
        ingredientLine,
      };
    });
  return { children, base, used: list };
}

/** Gray-square photo (no icon/initials), uses theme */
const PhotoThumb = memo(function PhotoThumb({ uri }) {
  const theme = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.thumb, { backgroundColor: theme.colors.surface }]}
        resizeMode="contain"
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
  const route = useRoute();
  const { id, initialIngredient } = route.params;
  const theme = useTheme();
  const { setIngredients } = useIngredientsData();
  const {
    ingredients = [],
    cocktails: cocktailsCtx = [],
    ingredientsById,
    updateUsageMap,
  } = useIngredientUsage();

  const initial = initialIngredient || ingredientsById.get(id) || null;
  const {
    children: initialChildren,
    base: initialBase,
    used: initialUsed,
  } = buildDetails(ingredients, cocktailsCtx, initial);

  const [ingredient, setIngredient] = useState(initial);
  const [brandedChildren, setBrandedChildren] = useState(initialChildren);
  const [baseIngredient, setBaseIngredient] = useState(initialBase);
  const [usedCocktails, setUsedCocktails] = useState(initialUsed);
  const [unlinkBaseVisible, setUnlinkBaseVisible] = useState(false);
  const [unlinkChildTarget, setUnlinkChildTarget] = useState(null);

  useEffect(() => {
    const current =
      ingredientsById.get(id) || route.params?.initialIngredient || null;
    if (!current) return;
    setIngredient((prev) => ({ ...prev, ...current }));
    const { children, base, used } = buildDetails(
      ingredients,
      cocktailsCtx,
      current
    );
    setBrandedChildren(children);
    setBaseIngredient(base);
    setUsedCocktails(used);
  }, [
    id,
    ingredients,
    cocktailsCtx,
    ingredientsById,
    route.params?.initialIngredient,
  ]);

  const handleGoBack = useCallback(() => {
    goBack(navigation);
  }, [navigation]);

  const handleEdit = useCallback(() => {
    navigation.navigate("EditIngredient", {
      id,
      returnTo: route.params?.returnTo,
      createdIngredient: route.params?.createdIngredient,
      targetLocalId: route.params?.targetLocalId,
    });
  }, [
    navigation,
    id,
    route.params?.returnTo,
    route.params?.createdIngredient,
    route.params?.targetLocalId,
  ]);

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
          <MaterialIcons name="edit" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleGoBack, handleEdit, theme.colors.onSurface]);

  useEffect(() => {
    const returnTo = route.params?.returnTo;
    if (!returnTo) return;
    const beforeRemove = (e) => {
      if (e.data.action.type === "NAVIGATE") return;
      e.preventDefault();
      sub();
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: "IngredientsMain" }] })
      );
      navigation.navigate("Cocktails", {
        screen: returnTo,
        params: {
          createdIngredient: route.params?.createdIngredient,
          targetLocalId: route.params?.targetLocalId,
        },
        merge: true,
      });
    };
    const sub = navigation.addListener("beforeRemove", beforeRemove);
    return sub;
  }, [
    navigation,
    route.params?.returnTo,
    route.params?.createdIngredient,
    route.params?.targetLocalId,
  ]);

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

  const load = useCallback(
    async (refresh = false) => {
      const [all, cocktails, ig, allowSubs] = await Promise.all([
        !refresh && ingredients.length ? ingredients : getAllIngredients(),
        !refresh && cocktailsCtx.length ? cocktailsCtx : getAllCocktails(),
        getIgnoreGarnish(),
        getAllowSubstitutes(),
      ]);
      const loaded = ingredientsById.get(id) || all.find((i) => i.id === id);
      setIngredient((prev) => (loaded ? { ...prev, ...loaded } : prev));
      const { children, base, used } = buildDetails(
        all,
        cocktails,
        loaded,
        ig,
        allowSubs
      );
      setBrandedChildren(children);
      setBaseIngredient(base);
      setUsedCocktails(used);
    },
    [id, ingredientsById, ingredients, cocktailsCtx]
  );

  const shouldLoad = !ingredients.length || !cocktailsCtx.length;
  useFocusEffect(
    useCallback(() => {
      if (!shouldLoad) return;
      let cancelled = false;
      (async () => {
        try {
          if (!cancelled) await load();
        } catch {}
      })();
      return () => {
        cancelled = true;
      };
    }, [load, shouldLoad])
  );

  useEffect(() => {
    const sub = addIgnoreGarnishListener(() => load());
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    const sub = addAllowSubstitutesListener(() => load());
    return () => sub.remove();
  }, [load]);

  const toggleInBar = useCallback(() => {
    if (!ingredient) return;
    const updated = { ...ingredient, inBar: !ingredient.inBar };
    setIngredient(updated);
    setIngredients((list) =>
      updateIngredientById(list, { id: updated.id, inBar: updated.inBar })
    );
    updateIngredientFields(updated.id, { inBar: updated.inBar });
  }, [ingredient, setIngredients]);

  const toggleInShoppingList = useCallback(() => {
    if (!ingredient) return;
    const updated = {
      ...ingredient,
      inShoppingList: !ingredient.inShoppingList,
    };
    setIngredient(updated);
    setIngredients((list) => {
      const nextList = updateIngredientById(list, {
        id: updated.id,
        inShoppingList: updated.inShoppingList,
      });
      updateIngredientFields(updated.id, {
        inShoppingList: updated.inShoppingList,
      });
      return nextList;
    });
  }, [ingredient, setIngredients]);

  const unlinkIngredients = useCallback(
    ({ base, brandeds }) => {
      const brandedList = Array.isArray(brandeds)
        ? brandeds.filter(Boolean)
        : brandeds
        ? [brandeds]
        : [];
      const updates = brandedList;
      const changedIds = [
        ...(base ? [base.id] : []),
        ...brandedList.map((b) => b.id),
      ];
      if (updates.length === 0) return;

      let nextList;
      setIngredients((list) => {
        nextList = list;
        updates.forEach((item) => {
          nextList = updateIngredientById(nextList, item);
        });
        return nextList;
      });

      updates.forEach((item) => {
        if (ingredient?.id === item.id) {
          setIngredient(item);
          setBaseIngredient(null);
        } else {
          setBrandedChildren((prev) => prev.filter((c) => c.id !== item.id));
        }
      });

      getAllowSubstitutes().then((allow) => {
        updateUsageMap(Array.from(nextList.values()), cocktailsCtx, {
          changedIngredientIds: changedIds,
          allowSubstitutes: !!allow,
        });
      });

      InteractionManager.runAfterInteractions(() => {
        db.withTransactionAsync(async () => {
          for (const item of updates) {
            await saveIngredient(item);
          }
        });
      });
    },
    [
      ingredient,
      setIngredient,
      setBaseIngredient,
      setBrandedChildren,
      setIngredients,
      updateUsageMap,
      cocktailsCtx,
    ]
  );

  const unlinkFromBase = useCallback(() => {
    if (ingredient?.baseIngredientId == null) return;
    setUnlinkBaseVisible(true);
  }, [ingredient]);

  const unlinkChild = useCallback((child) => {
    setUnlinkChildTarget(child);
  }, []);

  const goToIngredient = useCallback(
    (goId) => {
      navigation.push("IngredientDetails", { id: goId });
    },
    [navigation]
  );

  const goToCocktail = useCallback(
    (goId) => {
      navigation.push("CocktailDetails", { id: goId });
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
    <>
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
          <View style={styles.tagRow}>
            {ingredient.tags.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tag, { backgroundColor: tag.color }]}
              >
                <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {ingredient.description ? (
        <View style={styles.section}>
          <ExpandableText
            text={ingredient.description}
            style={[styles.sectionText, { color: theme.colors.onSurfaceVariant }]}
          />
        </View>
      ) : null}

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
            screen: "AddCocktail",
            params: { initialIngredient: ingredient, resetKey: Date.now() },
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
      <ConfirmationDialog
        visible={unlinkBaseVisible}
        title="Unlink"
        message="Remove link to base ingredient?"
        confirmLabel="Unlink"
        onCancel={() => setUnlinkBaseVisible(false)}
        onConfirm={() => {
          if (!ingredient) return;
          const updated = { ...ingredient, baseIngredientId: null };
          unlinkIngredients({ base: baseIngredient, brandeds: updated });
          setUnlinkBaseVisible(false);
        }}
      />
      <ConfirmationDialog
        visible={!!unlinkChildTarget}
        title="Unlink"
        message={
          unlinkChildTarget
            ? `Remove link for "${unlinkChildTarget.name}" from this base ingredient?`
            : ""
        }
        confirmLabel="Unlink"
        onCancel={() => setUnlinkChildTarget(null)}
        onConfirm={() => {
          const child = unlinkChildTarget;
          if (!child) return;
          const updatedChild = { ...child, baseIngredientId: null };
          unlinkIngredients({ base: ingredient, brandeds: updatedChild });
          setUnlinkChildTarget(null);
        }}
      />
    </>
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
  sectionText: { lineHeight: 20 },

  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { fontWeight: "bold" },

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
