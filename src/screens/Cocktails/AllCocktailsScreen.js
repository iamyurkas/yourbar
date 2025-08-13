import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeaderWithSearch from "../../components/HeaderWithSearch";
import { useTabMemory } from "../../context/TabMemoryContext";
import { getAllCocktails } from "../../storage/cocktailsStorage";
import { getAllIngredients } from "../../storage/ingredientsStorage";
import { useTheme } from "react-native-paper";
import TagFilterMenu from "../../components/TagFilterMenu";
import { getAllCocktailTags } from "../../storage/cocktailTagsStorage";
import CocktailRow, {
  COCKTAIL_ROW_HEIGHT as ITEM_HEIGHT,
} from "../../components/CocktailRow";

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

  const firstLoad = useRef(true);
  useEffect(() => {
    let cancel = false;
    if (!isFocused) return;
    (async () => {
      if (firstLoad.current) setLoading(true);
      const [cocktailsList, ingredientsList] = await Promise.all([
        getAllCocktails(),
        getAllIngredients(),
      ]);
      if (cancel) return;
      setCocktails(Array.isArray(cocktailsList) ? cocktailsList : []);
      setIngredients(Array.isArray(ingredientsList) ? ingredientsList : []);
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
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
        <CocktailRow
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
});
