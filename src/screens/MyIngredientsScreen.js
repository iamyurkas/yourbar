import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MyIngredientsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        This is the My Ingredients screen (in-stock)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18 },
});
