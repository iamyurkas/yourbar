import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import AllIngredientsTab from "./AllIngredientsTab";
import MyIngredientsTab from "./MyIngredientsTab";
import ShoppingIngredientsTab from "./ShoppingIngredientsTab";
import AddIngredientScreen from "./AddIngredientScreen";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";

export default function IngredientsScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        content: { flex: 1 },
        tabBar: {
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: theme.colors.outline,
        },
        tabButton: {
          flex: 1,
          padding: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        activeTab: {
          borderBottomWidth: 3,
          borderBottomColor: theme.colors.primary,
        },
        pressedTab: { opacity: 0.7 },
        tabText: { color: theme.colors.onSurfaceVariant },
        activeText: { color: theme.colors.primary, fontWeight: "bold" },
        createButton: { backgroundColor: theme.colors.primary },
        createText: { color: theme.colors.onPrimary, fontWeight: "bold" },
      }),
    [theme]
  );

  const [activeTab, setActiveTab] = useState("All");
  const navigation = useNavigation();

  const TabButton = ({ title, active, onPress }) => (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.activeTab,
        pressed && styles.pressedTab,
      ]}
    >
      <Text style={active ? styles.activeText : styles.tabText}>{title}</Text>
    </Pressable>
  );

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
