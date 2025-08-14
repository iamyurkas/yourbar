import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
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
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useTabMemory } from "../../context/TabMemoryContext";
import { getCocktailById, saveCocktail } from "../../storage/cocktailsStorage";
import { getAllIngredients } from "../../storage/ingredientsStorage";
import { getUnitById } from "../../constants/measureUnits";
import { getGlassById } from "../../constants/glassware";

/* ---------- helpers ---------- */
const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 9))
    return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex.length === 7 ? `${hex}${a}` : `${hex.slice(0, 7)}${a}`;
};

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
  garnish,
  optional,
  substituteFor,
  onPress,
}) {
  const theme = useTheme();
  const backgroundColor = inBar
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
      <View style={[styles.ingItem, !inBar && styles.dimmed]}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[
              styles.ingImage,
              { backgroundColor: theme.colors.background },
            ]}
            resizeMode="cover"
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
          {optional && (
            <Text
              style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
            >
              (optional)
            </Text>
          )}
          {garnish && (
            <Text
              style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
            >
              (garnish)
            </Text>
          )}
          {substituteFor && (
            <Text
              style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
            >
              Substitute for: {substituteFor}
            </Text>
          )}
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
  const { id } = useRoute().params;
  const theme = useTheme();
  const { getTab } = useTabMemory();
  const previousTab = getTab("cocktails");

  const [cocktail, setCocktail] = useState(null);
  const [ingMap, setIngMap] = useState(new Map());
  const [ingList, setIngList] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEdit = useCallback(() => {
    navigation.navigate("EditCocktail", { id });
  }, [navigation, id]);

  const handleRate = useCallback(
    async (value) => {
      if (!cocktail) return;
      const updated = { ...cocktail, rating: value };
      setCocktail(updated);
      await saveCocktail(updated);
    },
    [cocktail]
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

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (e.data.action.type === "NAVIGATE" || !previousTab) return;
      navigation.navigate(previousTab);
    });
    return unsub;
  }, [navigation, previousTab]);

  const load = useCallback(async () => {
    setLoading(true);
    const [loadedCocktail, allIngredients] = await Promise.all([
      getCocktailById(id),
      getAllIngredients(),
    ]);
    setCocktail(loadedCocktail || null);
    setIngMap(new Map((allIngredients || []).map((i) => [i.id, i])));
    setIngList(allIngredients || []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await load();
        } catch {}
      })();
    }, [load])
  );

  const rows = useMemo(() => {
    if (!cocktail) return [];
    const list = Array.isArray(cocktail.ingredients)
      ? [...cocktail.ingredients].sort((a, b) => a.order - b.order)
      : [];
    const allIngs = ingList;
    return list.map((r) => {
      const ing = r.ingredientId ? ingMap.get(r.ingredientId) : null;
      const originalName = ing?.name || r.name;
      const inBar = ing?.inBar;
      let substitute = null;
      if (!inBar && ing) {
        const baseId = ing.baseIngredientId ?? ing.id;

        if (r.allowBaseSubstitution) {
          const base = allIngs.find((i) => i.id === baseId && i.inBar);
          if (base) substitute = base;
        }

        const isBaseIngredient = ing.baseIngredientId == null;
        if (!substitute && (r.allowBrandedSubstitutes || isBaseIngredient)) {
          const brand = allIngs.find(
            (i) => i.inBar && i.baseIngredientId === baseId
          );
          if (brand) substitute = brand;
        }

        if (!substitute && Array.isArray(r.substitutes)) {
          for (const s of r.substitutes) {
            const candidate = ingMap.get(s.id);
            if (candidate?.inBar) {
              substitute = candidate;
              break;
            }
          }
        }
      }

      const display = substitute || ing || {};
      return {
        key: `${r.order}-${r.ingredientId ?? "free"}`,
        ingredientId: display.id || null,
        name: display.name || r.name,
        photoUri: display.photoUri || null,
        amount: r.amount,
        unitName: getUnitById(r.unitId)?.name || "",
        inBar: substitute ? substitute.inBar : inBar,
        garnish: !!r.garnish,
        optional: !!r.optional,
        substituteFor: substitute ? originalName : null,
      };
    });
  }, [cocktail, ingMap, ingList]);

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

      <View style={styles.body}>
        {glass && (
          <View style={styles.glassRow}>
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
        )}

        {Array.isArray(cocktail.tags) && cocktail.tags.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.onSurface }]}
            >
              Tags:
            </Text>
            <View style={styles.tagRow}>
              {cocktail.tags.map((tag) => (
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

        {cocktail.description ? (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {cocktail.description}
            </Text>
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
                      ? () =>
                          navigation.navigate("Ingredients", {
                            screen: "Create",
                            params: {
                              screen: "IngredientDetails",
                              params: { id: ingredientId, fromCocktailId: id },
                            },
                          })
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
  photo: { width: "100%", height: 200, marginTop: 12 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 24,
    marginHorizontal: 24,
  },
  body: { paddingHorizontal: 24, marginTop: 0 },
  glassRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  glassImage: { width: 40, height: 40, borderRadius: 8 },
  glassText: { marginLeft: 8 },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { color: "white", fontWeight: "bold" },
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
});
