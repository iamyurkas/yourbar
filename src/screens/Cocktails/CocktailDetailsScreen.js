import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CocktailDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cocktails' Details coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20 },
});
