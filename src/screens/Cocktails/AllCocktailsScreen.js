import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTabMemory } from "../../context/TabMemoryContext";

export default function AllCocktailsScreen() {
  const { setTab } = useTabMemory();
  const didSetTabRef = useRef(false);

  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("cocktails", "All");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cocktails coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20 },
});
