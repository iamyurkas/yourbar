import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ShakerIcon from "../../assets/shaker.svg";
import IngredientIcon from "../../assets/lemon.svg";

export default function SplashScreen() {
  const cocktailScale = useRef(new Animated.Value(0)).current;
  const shakerScale = useRef(new Animated.Value(0)).current;
  const ingredientScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(cocktailScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(shakerScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(ingredientScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [cocktailScale, shakerScale, ingredientScale]);

  return (
    <View style={styles.container}>
      <View style={styles.iconsRow}>
        <Animated.View style={{ transform: [{ scale: cocktailScale }] }}>
          <MaterialIcons name="local-bar" size={64} color="#333" />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: shakerScale }] }}>
          <ShakerIcon width={64} height={64} fill="#333" />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: ingredientScale }] }}>
          <IngredientIcon width={64} height={64} fill="#333" />
        </Animated.View>
      </View>
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
  iconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 240,
    marginBottom: 20,
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
