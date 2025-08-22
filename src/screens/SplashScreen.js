import React from "react";
import { View, Image, StyleSheet, Text } from "react-native";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/splash-icon.png")}
        style={styles.image}
      />
      <Text style={styles.title}>Your bar</Text>
      <Text style={styles.tagline}>your rules</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: "#666666",
  },
});
