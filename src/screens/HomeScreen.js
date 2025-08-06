import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to YourBar 🍸</Text>
      <Button
        title="Go to Ingredient Tags"
        onPress={() => navigation.navigate("Tags")}
      />
      <Button
        title="Add Ingredient"
        onPress={() => navigation.navigate("AddIngredient")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
