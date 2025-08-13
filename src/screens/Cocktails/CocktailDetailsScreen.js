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
import { getCocktailById } from "../../storage/cocktailsStorage";
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
  substituteFor,
}) {
  const theme = useTheme();
  const backgroundColor = inBar
    ? withAlpha(theme.colors.secondary, 0.25)
    : theme.colors.background;

  return (
    <View
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
          {amount ? (
            <Text
              style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
            >
              {amount} {unitName}
            </Text>
          ) : null}
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
              substitute for {substituteFor}
            </Text>
          )}
        </View>

        <MaterialIcons
          name={inBar ? "check-circle" : "radio-button-unchecked"}
          size={22}
          color={inBar ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </View>
    </View>
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
  const [loading, setLoading] = useState(true);

  const handleGoBack = useCallback(() => {
    if (previousTab) navigation.navigate(previousTab);
    else navigation.goBack();
  }, [navigation, previousTab]);

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
    });
  }, [navigation, handleGoBack, theme.colors.onSurface]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      handleGoBack();
    });
    return unsub;
  }, [navigation, handleGoBack]);

  const load = useCallback(async () => {
    setLoading(true);
    const [loadedCocktail, allIngredients] = await Promise.all([
      getCocktailById(id),
      getAllIngredients(),
    ]);
    setCocktail(loadedCocktail || null);
    setIngMap(new Map((allIngredients || []).map((i) => [i.id, i])));
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
    return list.map((r) => {
      const ing = r.ingredientId ? ingMap.get(r.ingredientId) : null;
      const originalName = ing?.name || r.name;
      const inBar = ing?.inBar;
      let substitute = null;
      if (!inBar && r.allowBaseSubstitution && ing) {
        const baseId = ing.baseIngredientId ?? ing.id;
        substitute = Array.from(ingMap.values()).find((i) => {
          if (!i.inBar) return false;
          if (i.id === baseId) return true;
          return i.baseIngredientId === baseId;
        });
      }
      const display = substitute || ing || {};
      return {
        key: `${r.order}-${r.ingredientId ?? "free"}`,
        name: display.name || r.name,
        photoUri: display.photoUri || null,
        amount: r.amount,
        unitName: getUnitById(r.unitId)?.name || "",
        inBar: substitute ? substitute.inBar : inBar,
        garnish: !!r.garnish,
        substituteFor: substitute ? originalName : null,
      };
    });
  }, [cocktail, ingMap]);

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
  const imageSource = cocktail.photoUri
    ? { uri: cocktail.photoUri }
    : glass?.image || null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {imageSource && (
          <Image source={imageSource} style={styles.photo} />
        )}

        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {cocktail.name}
        </Text>

        {glass && (
          <Text
            style={[styles.glass, { color: theme.colors.onSurfaceVariant }]}
          >
            {glass.name}
          </Text>
        )}

        {Array.isArray(cocktail.tags) && cocktail.tags.length > 0 && (
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
        )}

        {cocktail.description ? (
          <Text style={[styles.sectionText, { color: theme.colors.onSurface }]}>
            {cocktail.description}
          </Text>
        ) : null}

        {cocktail.instructions ? (
          <View style={{ marginTop: 16 }}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Instructions
            </Text>
            <Text
              style={[styles.sectionText, { color: theme.colors.onSurface }]}
            >
              {cocktail.instructions}
            </Text>
          </View>
        ) : null}

        {rows.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Ingredients
            </Text>
            <View style={styles.ingList}>
              {rows.map(({ key, ...props }) => (
                <IngredientRow key={key} {...props} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBackBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  scrollContent: { paddingBottom: 24 },
  photo: { width: "100%", height: 200 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginTop: 16,
  },
  glass: { marginHorizontal: 16, marginTop: 4 },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 16,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { fontSize: 10, color: "white", fontWeight: "bold" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  sectionText: { marginHorizontal: 16, marginTop: 8, lineHeight: 20 },

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
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },
  ingInfo: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16, fontWeight: "bold" },
  meta: { fontSize: 12, marginTop: 2 },
  dimmed: { opacity: 0.88 },
});
