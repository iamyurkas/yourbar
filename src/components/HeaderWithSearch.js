import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function HeaderWithSearch({
  onMenu,
  onSearch,
  onFilter,
  searchValue,
  setSearchValue,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onMenu}>
        <MaterialIcons name="menu" size={28} color="#333" />
      </TouchableOpacity>

      <View style={styles.searchBox}>
        <MaterialIcons
          name="search"
          size={20}
          color="#999"
          style={{ marginLeft: 6 }}
        />
        <TextInput
          placeholder="Search"
          value={searchValue}
          onChangeText={setSearchValue}
          style={styles.input}
        />
      </View>

      <TouchableOpacity onPress={onFilter}>
        <MaterialIcons name="filter-list" size={28} color="#333" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 16,
    color: "#333",
  },
});
