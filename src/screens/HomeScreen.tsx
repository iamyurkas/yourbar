import React from "react";

import { View, Text, Button, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to YourBar 🍸</Text>

      <View style={styles.buttonWrapper}>
        <Button
          title="Go to Ingredient Tags"
          onPress={() => navigation.navigate("Tags")}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          title="Add Ingredient"
          onPress={() => navigation.navigate("AddIngredient")}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          title="View All Ingredients"
          onPress={() => navigation.navigate("AllIngredients")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 32,
  },
  buttonWrapper: {
    width: "100%",
    marginBottom: 12,
  },
});
