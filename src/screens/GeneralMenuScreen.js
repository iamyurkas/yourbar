// src/screens/GeneralMenuScreen.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function GeneralMenuScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("EditCustomTags")}
      >
        <MaterialIcons name="label" size={22} color="#4DABF7" />
        <Text style={styles.menuText}>Edit custom tags</Text>
        <MaterialIcons name="chevron-right" size={22} color="#999" />
      </TouchableOpacity>

      {/* тут пізніше можна додавати інші пункти меню */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
});
