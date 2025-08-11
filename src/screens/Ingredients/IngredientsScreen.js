import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AllIngredientsTab from "./AllIngredientsTab";
import MyIngredientsTab from "./MyIngredientsTab";
import ShoppingIngredientsTab from "./ShoppingIngredientsTab";
import AddIngredientScreen from "./AddIngredientScreen";
import { useNavigation } from "@react-navigation/native";

export default function IngredientsScreen() {
  const [activeTab, setActiveTab] = useState("All");
  const navigation = useNavigation();

  let Content;
  if (activeTab === "All") Content = <AllIngredientsTab />;
  else if (activeTab === "My") Content = <MyIngredientsTab />;
  else if (activeTab === "Shopping") Content = <ShoppingIngredientsTab />;
  else Content = <Text>Unknown tab</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.content}>{Content}</View>

      <View style={styles.tabBar}>
        <TabButton
          title="All"
          active={activeTab === "All"}
          onPress={() => setActiveTab("All")}
        />
        <TabButton
          title="My"
          active={activeTab === "My"}
          onPress={() => setActiveTab("My")}
        />
        <TabButton
          title="Shopping"
          active={activeTab === "Shopping"}
          onPress={() => setActiveTab("Shopping")}
        />
        <TouchableOpacity
          style={[styles.tabButton, styles.createButton]}
          onPress={() => navigation.navigate("AddIngredient")}
        >
          <Text style={styles.createText}>+ Create</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TabButton({ title, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTab]}
    >
      <Text style={active ? styles.activeText : styles.tabText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  tabButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#4DABF7",
  },
  tabText: {
    color: "#666",
  },
  activeText: {
    color: "#4DABF7",
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#4DABF7",
  },
  createText: {
    color: "white",
    fontWeight: "bold",
  },
});
