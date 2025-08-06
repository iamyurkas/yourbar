import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ShakerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Shaker coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20 },
});
