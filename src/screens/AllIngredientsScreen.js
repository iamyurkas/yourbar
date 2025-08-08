import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getAllIngredients } from "../storage/ingredientsStorage";
import HeaderWithSearch from "../components/HeaderWithSearch";
import { useTabMemory } from "../context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";

export default function AllIngredientsScreen() {
  const { setTab } = useTabMemory();
  const navigation = useNavigation();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTab("ingredients", "All");
  }, []);

  const sortIngredients = (data) => {
    return data.sort((a, b) =>
      a.name.localeCompare(b.name, "uk", { sensitivity: "base" })
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadIngredients = async () => {
        const data = await getAllIngredients();
        setIngredients(sortIngredients(data));
      };
      loadIngredients();
    }, [])
  );

  useEffect(() => {
    const load = async () => {
      const data = await getAllIngredients();
      setIngredients(sortIngredients(data));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4DABF7" />
        <Text style={{ marginTop: 12 }}>Loading ingredients...</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const isBranded = !!item.baseIngredientId; // брендований, якщо є посилання на базу

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Create", {
            screen: "IngredientDetails",
            params: { id: item.id },
          })
        }
      >
        <View style={item.inBar === true ? styles.highlightWrapper : null}>
          <View
            style={[
              styles.item,
              isBranded && styles.brandedStripe, // додаємо смужку, якщо брендований
            ]}
          >
            {/* Shopping cart icon */}
            {item.inShoppingList && (
              <MaterialIcons
                name="shopping-cart"
                size={16}
                color="#4DABF7"
                style={styles.cartIcon}
              />
            )}

            {item.photoUri ? (
              <Image
                source={{ uri: item.photoUri }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.placeholderText}>No image</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.tags?.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.map((tag) => (
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
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderWithSearch
        searchValue={search}
        setSearchValue={setSearch}
        onMenu={() => console.log("Open menu")}
        onFilter={() => console.log("Open filter")}
      />

      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const IMAGE_SIZE = 50;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  listContent: {
    backgroundColor: "white",
  },
  highlightWrapper: {
    backgroundColor: "#E3F2FD",
    borderBottomWidth: 1,
    borderBottomColor: "#fff",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#ffffff",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  cartIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    zIndex: 1,
  },
  brandedStripe: {
    borderLeftWidth: 4,
    borderLeftColor: "green",
    paddingLeft: 4,
  },
});
