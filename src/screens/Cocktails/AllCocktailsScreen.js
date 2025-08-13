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
import TagFilterModal from "../../components/TagFilterModal";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";

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
            {Array.isArray(tags) && tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((tag) => (
                  <View
                    key={tag.id}
                    style={[styles.tag, { backgroundColor: tag.color }]}
                  >
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [navigatingId, setNavigatingId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);
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
      const ingMap = new Map((ingredientsList || []).map((i) => [i.id, i]));
      let list = Array.isArray(cocktailsList) ? cocktailsList : [];
      const q = searchDebounced.trim().toLowerCase();
      if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
      if (selectedTagIds.length > 0)
        list = list.filter(
          (c) =>
            Array.isArray(c.tags) &&
            c.tags.some((t) => selectedTagIds.includes(t.id))
        );
      const prepared = list.map((c) => {
        const required = (c.ingredients || []).filter((r) => !r.optional);
        const allAvail =
          required.length > 0 &&
          required.every((r) => {
            const ing = ingMap.get(r.ingredientId);
            return ing && ing.inBar;
          });
        const branded = (c.ingredients || []).some((r) => {
          const ing = ingMap.get(r.ingredientId);
          return ing && ing.baseIngredientId != null;
        });
        return { ...c, isAllAvailable: allAvail, hasBranded: branded };
      });
      setCocktails(prepared);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [isFocused, searchDebounced, selectedTagIds]);

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
        onSearch={() => {}}
        searchValue={search}
        setSearchValue={setSearch}
        onFilter={() => setTagModalVisible(true)}
      />
      <FlashList
        data={cocktails}
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
      <TagFilterModal
        visible={tagModalVisible}
        onClose={() => setTagModalVisible(false)}
        tags={availableTags}
        selected={selectedTagIds}
        setSelected={setSelectedTagIds}
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
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  placeholder: { justifyContent: "center", alignItems: "center" },
  placeholderText: { fontSize: 10, textAlign: "center" },

  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16, fontWeight: "bold" },

  tagRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: { fontSize: 10, color: "white", fontWeight: "bold" },

  brandedStripe: { borderLeftWidth: 4, paddingLeft: 4 },
});
