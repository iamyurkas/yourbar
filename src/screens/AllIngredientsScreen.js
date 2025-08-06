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

export default function AllIngredientsScreen() {
  const { setTab } = useTabMemory(); // 🔹 отримуємо функцію з контексту
  const navigation = useNavigation();

  // 🔹 Зберігаємо активний таб "All" у групі "ingredients"
  useEffect(() => {
    setTab("ingredients", "All");
  }, []);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      const loadIngredients = async () => {
        const data = await getAllIngredients(); // або твоя функція завантаження
        setIngredients(data);
      };
      loadIngredients();
    }, [])
  );

  useEffect(() => {
    const load = async () => {
      const data = await getAllIngredients();
      setIngredients(data);
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        navigation.navigate("Create", {
          screen: "IngredientDetails",
          params: { id: item.id, previousTab: "All" },
        })
      }
    >
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.image} />
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
    </TouchableOpacity>
  );

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
        contentContainerStyle={styles.container}
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
    padding: 16,
    backgroundColor: "white",
  },
  item: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#eee",
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
});
