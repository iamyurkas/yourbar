import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  StackActions,
} from "@react-navigation/native";
import { goBack } from "../../utils/navigation";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getCocktailById,
  saveCocktail,
  updateCocktailById,
} from "../../storage/cocktailsStorage";
import {
  getIngredientsByIds,
  getIngredientsByBaseIds,
} from "../../storage/ingredientsStorage";
import { useIngredientUsage } from "../../context/IngredientUsageContext";
import { getGlassById } from "../../constants/glassware";
import { withAlpha } from "../../utils/color";
import {
  getUseMetric,
  getIgnoreGarnish,
  addIgnoreGarnishListener,
  getKeepAwake,
  addKeepAwakeListener,
  getAllowSubstitutes,
  addAllowSubstitutesListener,
} from "../../storage/settingsStorage";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import ExpandableText from "../../components/ExpandableText";
import {
  buildIngredientIndex,
  getCocktailIngredientRows,
} from "../../utils/cocktailIngredients";

/* ---------- Ingredient row (like AllIngredients) ---------- */
const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;

const IngredientRow = memo(function IngredientRow({
  name,
  photoUri,
  amount,
  unitName,
  inBar,
  ignored,
  garnish,
  optional,
  substituteFor,
  declaredSubstitutes = [],
  baseSubstitutes = [],
  brandedSubstitutes = [],
  isBranded,
  onPress,
}) {
  const theme = useTheme();
  const backgroundColor = inBar && !ignored
    ? withAlpha(theme.colors.secondary, 0.25)
    : theme.colors.background;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.ingWrapper,
        { borderBottomColor: theme.colors.background, backgroundColor },
      ]}
    >
      <View
        style={[
          styles.ingItem,
          isBranded && {
            ...styles.brandedStripe,
            borderLeftColor: theme.colors.primary,
          },
          !inBar && !ignored && styles.dimmed,
        ]}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[
              styles.ingImage,
              { backgroundColor: theme.colors.background },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View
            style={[
              styles.ingImage,
              styles.placeholder,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[
                styles.placeholderText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No image
            </Text>
          </View>
        )}

        <View style={styles.ingInfo}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: theme.colors.onSurface }]}
          >
            {name}
          </Text>
          {(() => {
            const lines = [];
            const propLine = [
              garnish && "garnish",
              optional && "optional",
            ]
              .filter(Boolean)
              .join(", ");
            if (propLine) lines.push(`(${propLine})`);
            if (substituteFor) lines.push(`Substitute for: ${substituteFor}`);
            const allSubs = Array.from(
              new Set([
                ...declaredSubstitutes,
                ...baseSubstitutes,
                ...brandedSubstitutes,
              ])
            );
            if (!inBar && !substituteFor && allSubs.length > 0) {
              allSubs.forEach((s, i) =>
                lines.push(i === 0 ? `or ${s}` : s)
              );
            } else {
              declaredSubstitutes.forEach((s) => lines.push(s));
              baseSubstitutes.forEach((s) => lines.push(s));
              brandedSubstitutes.forEach((s) => lines.push(s));
            }
            return lines.map((line, idx) => (
              <Text
                key={idx}
                numberOfLines={1}
                style={[
                  styles.meta,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {line}
              </Text>
            ));
          })()}
        </View>

        {amount ? (
          <Text
            style={[
              styles.amountText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {amount} {unitName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function CocktailDetailsScreen() {
  const navigation = useNavigation();
  const { id, backToIngredientId, initialCocktail } = useRoute().params;
  const theme = useTheme();
  const {
    ingredients: globalIngredients = [],
    cocktails: globalCocktails = [],
    setCocktails: setGlobalCocktails,
  } = useIngredientUsage();

  const [cocktail, setCocktail] = useState(initialCocktail || null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(!initialCocktail);
  const [showImperial, setShowImperial] = useState(false);
  const [ignoreGarnish, setIgnoreGarnish] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [allowSubstitutes, setAllowSubstitutes] = useState(false);
  const showImperialLocked = useRef(false);

  const { ingMap, byBase, bySearch } = useMemo(
    () => buildIngredientIndex(ingredients),
    [ingredients]
  );

  const handleGoBack = useCallback(() => {
    if (backToIngredientId != null) {
      navigation.navigate("Ingredients", {
        screen: "IngredientDetails",
        params: { id: backToIngredientId },
      });
      navigation.dispatch(StackActions.pop(1));
    } else {
      goBack(navigation);
    }
  }, [navigation, backToIngredientId]);

  const handleEdit = useCallback(() => {
    navigation.navigate("EditCocktail", { id });
  }, [navigation, id]);

  const handleClone = useCallback(() => {
    if (!cocktail) return;
    navigation.navigate("AddCocktail", { initialCocktail: cocktail });
  }, [navigation, cocktail]);

  const handleRate = useCallback(
    async (value) => {
      if (!cocktail) return;
      const prev = cocktail;
      const newRating = cocktail.rating === value ? 0 : value;
      const updated = { ...cocktail, rating: newRating };
      setCocktail(updated);
      setGlobalCocktails((prevList) =>
        Array.isArray(prevList) ? updateCocktailById(prevList, updated) : prevList
      );
      try {
        const saved = await saveCocktail(updated);
        setCocktail(saved);
        setGlobalCocktails((prevList) =>
          Array.isArray(prevList) ? updateCocktailById(prevList, saved) : prevList
        );
      } catch (e) {
        setCocktail(prev);
        setGlobalCocktails((prevList) =>
          Array.isArray(prevList) ? updateCocktailById(prevList, prev) : prevList
        );
      }
    },
    [cocktail, setGlobalCocktails]
  );

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
    async (refresh = false, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      const [loadedCocktail, useMetric, ig, allowSubs] = await Promise.all([
        getCocktailById(id),
        getUseMetric(),
        getIgnoreGarnish(),
        getAllowSubstitutes(),
      ]);
      // If DB hasn't yet persisted ingredients, fall back to existing state/route data
      setCocktail((prev) => {
        if (!loadedCocktail) return prev;
        if (!prev) return loadedCocktail;
        const mergedIngs = (loadedCocktail.ingredients && loadedCocktail.ingredients.length)
          ? loadedCocktail.ingredients
          : (prev.ingredients || []);
        return { ...loadedCocktail, ingredients: mergedIngs, rating: prev.rating };
      });
      const fallbackRows = (loadedCocktail?.ingredients && loadedCocktail.ingredients.length)
        ? loadedCocktail.ingredients
        : (initialCocktail?.ingredients || []);
      const ingredientIds = Array.from(
        new Set(
          (fallbackRows || [])
            .flatMap((r) => [
              r.ingredientId,
              ...(Array.isArray(r.substitutes)
                ? r.substitutes.map((s) => s.id)
                : []),
            ])
            .filter(Boolean)
        )
      );
      let allIngredients = [];
      if (ingredientIds.length) {
        allIngredients = await getIngredientsByIds(ingredientIds);
        const allowBaseSubs =
          allowSubs ||
          (loadedCocktail?.ingredients || []).some(
            (r) => r.allowBaseSubstitution
          );
        if (allowBaseSubs) {
          const baseMap = new Map(
            allIngredients.map((i) => [i.id, i.baseIngredientId])
          );
          const baseIds = Array.from(
            new Set(
              (loadedCocktail?.ingredients || [])
                .filter((r) => allowSubs || r.allowBaseSubstitution)
                .map((r) => baseMap.get(r.ingredientId))
                .filter(
                  (bid) => bid != null && !ingredientIds.includes(bid)
                )
            )
          );
          if (baseIds.length) {
            const baseIngredients = await getIngredientsByIds(baseIds);
            allIngredients = allIngredients.concat(baseIngredients);
          }
        }

        const brandBaseIds = Array.from(
          new Set(allIngredients.map((i) => i.baseIngredientId ?? i.id))
        );
        if (brandBaseIds.length) {
          const branded = await getIngredientsByBaseIds(brandBaseIds, {
            inBarOnly: true,
          });
          if (branded.length) {
            const map = new Map(allIngredients.map((i) => [i.id, i]));
            for (const b of branded) map.set(b.id, b);
            allIngredients = Array.from(map.values());
          }
        }
      }
      setIngredients(allIngredients);
      if (!showImperialLocked.current) setShowImperial(!useMetric);
      setIgnoreGarnish(!!ig);
      setAllowSubstitutes(!!allowSubs);
      if (showSpinner) setLoading(false);
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await load(false, !initialCocktail);
        } catch {}
      })();
    }, [load, initialCocktail])
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const enabled = await getKeepAwake();
          setKeepAwake(!!enabled);
        } catch {}
      })();
      const sub = addKeepAwakeListener(setKeepAwake);
      return () => {
        sub.remove();
        deactivateKeepAwake();
      };
    }, [])
  );

  useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepAwake]);

  useEffect(() => {
    const sub = addIgnoreGarnishListener(setIgnoreGarnish);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = addAllowSubstitutesListener(setAllowSubstitutes);
    return () => sub.remove();
  }, []);

  // Hydrate ingredients list from global cache only if we don't have any yet.
  useEffect(() => {
    if (ingredients.length === 0 && globalIngredients.length) {
      setIngredients(globalIngredients);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalIngredients, ingredients.length]);

  // When the global cocktail list updates, merge the item into local state.
  // If the cocktail references ingredient ids that we don't have cached yet,
  // perform a full reload to fetch the missing ingredient rows.
  const loadingMissingRef = useRef(false);
  useEffect(() => {
    const updated = globalCocktails.find((c) => c.id === id);
    if (!updated) return;

    const missingIngredient = (updated.ingredients || []).some(
      (r) =>
        (r.ingredientId && !ingMap.has(r.ingredientId)) ||
        (Array.isArray(r.substitutes) &&
          r.substitutes.some((s) => s.id && !ingMap.has(s.id)))
    );

    setCocktail((prev) => {
      if (!prev) return updated;
      if (
        prev.updatedAt >= updated.updatedAt &&
        (prev.ingredients?.length || 0) >= (updated.ingredients?.length || 0)
      ) {
        return prev;
      }
      return { ...prev, ...updated };
    });

    if (missingIngredient && !loadingMissingRef.current) {
      loadingMissingRef.current = true;
      (async () => {
        try {
          await load(true, false);
        } catch {}
        loadingMissingRef.current = false;
      })();
    }
  }, [globalCocktails, id]);

  const rows = useMemo(
    () =>
      cocktail
        ? getCocktailIngredientRows(cocktail, {
            ingMap,
            byBase,
            bySearch,
            allowSubstitutes,
            ignoreGarnish,
            showImperial,
          })
        : [],
    [
      cocktail,
      ingMap,
      byBase,
      allowSubstitutes,
      ignoreGarnish,
      showImperial,
    ],
  );

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  if (!cocktail)
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Cocktail not found
        </Text>
      </View>
    );

  const glass = cocktail.glassId ? getGlassById(cocktail.glassId) : null;

  const ratingStars = (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <TouchableOpacity
          key={value}
          onPress={() => handleRate(value)}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons
            name={value <= (cocktail?.rating ?? 0) ? "star" : "star-border"}
            size={34}
            color={theme.colors.secondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>
        {cocktail.name}
      </Text>

      {cocktail.photoUri ? (
        <Image
          source={{ uri: cocktail.photoUri }}
          style={styles.photo}
          resizeMode="contain"
        />
      ) : glass ? (
        <Image source={glass.image} style={styles.photo} resizeMode="contain" />
      ) : null}

      {ratingStars}

      <TouchableOpacity
        onPress={() => {
          showImperialLocked.current = true;
          setShowImperial((v) => !v);
        }}
        style={[styles.toggleBtn, { borderColor: theme.colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={
          showImperial ? "Show in metric" : "Show in imperial"
        }
      >
        <Text style={{ color: theme.colors.primary }}>
          {showImperial ? "Show in metric" : "Show in imperial"}
        </Text>
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.glassRow}>
          {glass ? (
            <View style={styles.glassInfo}>
              <Image
                source={glass.image}
                style={[
                  styles.glassImage,
                  { backgroundColor: theme.colors.surface },
                ]}
              />
              <Text
                style={[
                  styles.glassText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {glass.name}
              </Text>
            </View>
          ) : (
            <View style={styles.glassInfo} />
          )}
          <TouchableOpacity onPress={handleClone}>
            <View style={styles.cloneRow}>
              <Text style={[styles.cloneText, { color: theme.colors.primary }]}>
                Clone and edit
              </Text>
              <MaterialIcons
                name="content-copy"
                size={16}
                color={theme.colors.primary}
                style={styles.cloneIcon}
              />
            </View>
          </TouchableOpacity>
        </View>

        {Array.isArray(cocktail.tags) && cocktail.tags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.tagRow}>
              {cocktail.tags.map((tag) => (
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

        {cocktail.description ? (
          <View style={styles.section}>
            <ExpandableText
              text={cocktail.description}
              style={[styles.sectionText, { color: theme.colors.onSurfaceVariant }]}
            />
          </View>
        ) : null}

        {cocktail.instructions ? (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
            >
              Instructions:
            </Text>
            <Text
              style={[styles.sectionText, { color: theme.colors.onSurface }]}
            >
              {cocktail.instructions}
            </Text>
          </View>
        ) : null}

        {rows.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
            >
              Ingredients:
            </Text>
            <View style={[styles.ingList, { marginHorizontal: -24 }]}>
              {rows.map(({ key, ingredientId, ...props }) => (
                <IngredientRow
                  key={key}
                  {...props}
                  onPress={
                    ingredientId
                      ? () => navigation.push("IngredientDetails", { id: ingredientId })
                      : undefined
                  }
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBackBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerEditBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  photo: { width: 150, height: 150, marginTop: 12, alignSelf: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 24,
    marginHorizontal: 24,
  },
  body: { paddingHorizontal: 24, marginTop: 0 },
  glassRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  glassInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  glassImage: { width: 40, height: 40, borderRadius: 8 },
  glassText: { marginLeft: 8, flexShrink: 1 },
  cloneText: { fontSize: 14 },
  cloneRow: { flexDirection: "row", alignItems: "center" },
  cloneIcon: { marginLeft: 4 },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    alignSelf: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { fontWeight: "bold" },
  section: { marginTop: 16 },
  sectionLabel: { fontWeight: "bold", marginBottom: 8 },
  sectionText: { lineHeight: 20 },

  ingList: { marginTop: 8 },
  ingWrapper: { borderBottomWidth: ROW_BORDER },
  ingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
  },
  ingImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    aspectRatio: 1,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },
  ingInfo: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16 },
  meta: { fontSize: 12, marginTop: 2 },
  amountText: { fontSize: 14, marginLeft: 8 },
  dimmed: { opacity: 0.88 },
  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
});
