import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import { useTabMemory } from "../../context/TabMemoryContext";
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { getAllIngredients } from "../../storage/ingredientsStorage";
import { getGlassById } from "../../constants/glassware";
import { useTheme } from "react-native-paper";
import TagFilterMenu from "../../components/TagFilterMenu";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import { MaterialIcons } from "@expo/vector-icons";

// --- helpers ---
const withAlpha = (hex, alpha) => {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};

// --- list constants ---
const IMAGE_SIZE = 50;
const ROW_VERTICAL = 8;
const ROW_BORDER = 1;
const ITEM_HEIGHT = ROW_VERTICAL * 2 + Math.max(IMAGE_SIZE, 40) + ROW_BORDER;

// --- row component ---
const ItemRow = memo(
  function ItemRow({
    id,
    name,
    photoUri,
    glassId,
    tags,
    ingredientLine,
    rating,
    isAllAvailable,
    hasBranded,
    onPress,
    isNavigating,
  }) {
    const theme = useTheme();
    const ripple = useMemo(
      () => ({ color: withAlpha(theme.colors.tertiary, 0.35) }),
      [theme.colors.tertiary]
    );
    const glassImage = glassId ? getGlassById(glassId)?.image : null;
    const backgroundColor = isAllAvailable
      ? withAlpha(theme.colors.secondary, 0.25)
      : theme.colors.background;
    return (
      <View
        style={[
          styles.wrapper,
          {
            borderBottomColor: theme.colors.background,
            backgroundColor,
          },
        ]}
      >
        <Pressable
          onPress={() => onPress(id)}
          android_ripple={ripple}
          style={({ pressed }) => [
            styles.item,
            hasBranded && {
              ...styles.brandedStripe,
              borderLeftColor: theme.colors.primary,
            },
            !isAllAvailable && styles.dimmed,
            isNavigating && {
              ...styles.navigatingRow,
              backgroundColor: withAlpha(theme.colors.tertiary, 0.3),
            },
            pressed && styles.pressed,
          ]}
          hitSlop={{ top: 4, bottom: 4 }}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[
                styles.image,
                { backgroundColor: theme.colors.background },
              ]}
              resizeMode="cover"
            />
          ) : glassImage ? (
            <Image
              source={glassImage}
              style={[
                styles.image,
                { backgroundColor: theme.colors.background },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
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
          <View style={styles.info}>
            <Text
              numberOfLines={1}
              style={[styles.name, { color: theme.colors.onSurface }]}
            >
              {name}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.ingredients, { color: theme.colors.onSurfaceVariant }]}
            >
              {ingredientLine || "\u00A0"}
            </Text>
          </View>
          {Array.isArray(tags) && tags.length > 0 && (
            <View style={styles.tagDots}>
              {tags.map((tag, idx) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagDot,
                    idx === 0 && styles.firstTagDot,
                    { backgroundColor: tag.color },
                  ]}
                />
              ))}
            </View>
          )}
          {rating > 0 && (
            <View style={styles.rating}>
              {Array.from({ length: Math.round(rating) }).map((_, i) => (
                <MaterialIcons
                  key={i}
                  name="star"
                  size={10}
                  color={theme.colors.secondary}
                />
              ))}
            </View>
          )}
        </Pressable>
      </View>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.photoUri === next.photoUri &&
    prev.glassId === next.glassId &&
    prev.tags === next.tags &&
    prev.ingredientLine === next.ingredientLine &&
    prev.rating === next.rating &&
    prev.isAllAvailable === next.isAllAvailable &&
    prev.hasBranded === next.hasBranded &&
    prev.isNavigating === next.isNavigating
);

export default function AllCocktailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [cocktails, setCocktails] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  const didSetTabRef = useRef(false);
  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("cocktails", "All");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getAllCocktailTags();
      if (!cancelled) setAvailableTags(all);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(h);
  }, [search]);

  useEffect(() => {
    let cancel = false;
    if (!isFocused) return;
    (async () => {
      setLoading(true);
      const [cocktailsList, ingredientsList] = await Promise.all([
        getAllCocktails(),
        getAllIngredients(),
      ]);
      if (cancel) return;
      setCocktails(Array.isArray(cocktailsList) ? cocktailsList : []);
      setIngredients(Array.isArray(ingredientsList) ? ingredientsList : []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [isFocused]);

  const filtered = useMemo(() => {
    const ingMap = new Map(
      (ingredients || []).map((i) => [String(i.id), i])
    );
    const q = searchDebounced.trim().toLowerCase();
    let list = cocktails;
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    if (selectedTagIds.length > 0)
      list = list.filter(
        (c) =>
          Array.isArray(c.tags) &&
          c.tags.some((t) => selectedTagIds.includes(t.id))
      );
    return list.map((c) => {
      const required = (c.ingredients || []).filter((r) => !r.optional);
      const missing = [];
      const allAvail =
        required.length > 0 &&
        required.every((r) => {
          const ing = ingMap.get(String(r.ingredientId));
          if (ing?.inBar) return true;
          if (ing) {
            const baseId = String(ing.baseIngredientId ?? ing.id);
            if (r.allowBaseSubstitution) {
              const base = ingMap.get(baseId);
              if (base?.inBar) return true;
            }
            if (r.allowBrandedSubstitutes) {
              const brand = ingredients.find(
                (i) => i.inBar && String(i.baseIngredientId) === baseId
              );
              if (brand) return true;
            }
          }
          if (Array.isArray(r.substitutes)) {
            for (const s of r.substitutes) {
              const candidate = ingMap.get(String(s.id));
              if (candidate?.inBar) return true;
            }
          }
          if (ing?.name) missing.push(ing.name);
          return false;
        });
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
  }, [cocktails, ingredients, searchDebounced, selectedTagIds]);

  const handlePress = useCallback(
    (id) => {
      setNavigatingId(id);
      navigation.navigate("Create", {
        screen: "CocktailDetails",
        params: { id },
      });
      setTimeout(() => setNavigatingId(null), 500);
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ItemRow
        id={item.id}
        name={item.name}
        photoUri={item.photoUri}
        glassId={item.glassId}
        tags={item.tags}
        ingredientLine={item.ingredientLine}
        rating={item.rating}
        isAllAvailable={item.isAllAvailable}
        hasBranded={item.hasBranded}
        onPress={handlePress}
        isNavigating={navigatingId === item.id}
      />
    ),
    [handlePress, navigatingId]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <HeaderWithSearch
        onMenu={() => navigation.openDrawer?.()}
        searchValue={search}
        setSearchValue={setSearch}
        filterComponent={
          <TagFilterMenu
            tags={availableTags}
            selected={selectedTagIds}
            setSelected={setSelectedTagIds}
          />
        }
      />
      <FlashList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={ITEM_HEIGHT}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={12}
        getItemType={() => "COCKTAIL"}
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No cocktails found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },

  wrapper: { borderBottomWidth: ROW_BORDER },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_VERTICAL,
    paddingHorizontal: 12,
    position: "relative",
  },
  dimmed: { opacity: 0.88 },

  navigatingRow: { opacity: 0.6 },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: Platform.OS === "ios" ? 0.98 : 0.99 }],
  },

  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    aspectRatio: 1,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },

  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16 },
  ingredients: { fontSize: 12, marginTop: 4 },

  tagDots: { flexDirection: "row", alignSelf: "flex-start" },
  tagDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  firstTagDot: { marginLeft: 0 },

  rating: { position: "absolute", bottom: 4, right: 4, flexDirection: "row" },

  brandedStripe: { borderLeftWidth: 4, paddingLeft: 8 },
});
