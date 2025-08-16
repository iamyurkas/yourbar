import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { getUserTags } from "../storage/ingredientTagsStorage";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useTheme } from "react-native-paper";

export default function TagsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { padding: 16 },
        tagSection: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
        tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, margin: 4 },
        tagText: { color: theme.colors.onPrimary, fontWeight: "bold" },
        sectionTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
        addButton: {
          backgroundColor: theme.colors.primary,
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
          margin: 16,
        },
        addText: { color: theme.colors.onPrimary, fontWeight: "bold" },
      }),
    [theme]
  );

  const [userTags, setUserTags] = useState([]);

  useEffect(() => {
    if (isFocused) {
      (async () => {
        const loaded = await getUserTags();
        setUserTags(loaded);
      })();
    }
  }, [isFocused]);

  const handleBuiltInTap = () => {
    Alert.alert("Built-in Tag", "Built-in tags cannot be edited or deleted.");
  };

  const handleUserTagTap = (tag) => {
    navigation.navigate("EditTag", { tag });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Built-in Tags</Text>
        <View style={styles.tagSection}>
          {BUILTIN_INGREDIENT_TAGS.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              onPress={handleBuiltInTap}
              style={[styles.tag, { backgroundColor: tag.color }]}
            >
              <Text style={styles.tagText}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your Tags</Text>
        <View style={styles.tagSection}>
          {userTags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              onPress={() => handleUserTagTap(tag)}
              style={[styles.tag, { backgroundColor: tag.color }]}
            >
              <Text style={styles.tagText}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => navigation.navigate("AddTag")}
        style={styles.addButton}
      >
        <Text style={styles.addText}>+ Add Tag</Text>
      </TouchableOpacity>
    </>
  );
}

