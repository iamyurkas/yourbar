import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTabMemory } from "../../context/TabMemoryContext";

export default function MyCocktailsScreen() {
  const { setTab } = useTabMemory();
  const didSetTabRef = useRef(false);

  useEffect(() => {
    if (!didSetTabRef.current) {
      setTab("cocktails", "My");
      didSetTabRef.current = true;
    }
  }, [setTab]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>My cocktails coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20 },
});
