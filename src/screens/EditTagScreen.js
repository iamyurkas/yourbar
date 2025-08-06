import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { getUserTags, saveUserTags } from "../storage/ingredientTagsStorage";
import { useNavigation, useRoute } from "@react-navigation/native";
import WheelColorPicker from "react-native-wheel-color-picker";

export default function EditTagScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tag } = route.params;

  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Please enter a name for the tag.");
      return;
    }

    const allTags = await getUserTags();
    const updatedTags = allTags.map((t) =>
      t.id === tag.id ? { ...t, name: name.trim(), color } : t
    );
    await saveUserTags(updatedTags);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Tag",
      `Are you sure you want to delete "${tag.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const allTags = await getUserTags();
            const updatedTags = allTags.filter((t) => t.id !== tag.id);
            await saveUserTags(updatedTags);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.label}>Tag name:</Text>
      <TextInput
        placeholder="e.g. bitters"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Choose color:</Text>
      <View style={styles.colorPreview}>
        <View style={[styles.colorBox, { backgroundColor: color }]} />
        <Text style={styles.colorCode}>{color}</Text>
      </View>

      <WheelColorPicker
        color={color}
        onColorChange={setColor}
        thumbStyle={{ borderWidth: 2, borderColor: "#000" }}
        style={{ height: 240, marginBottom: 16 }}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Tag</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "white",
    flex: 1,
  },
  label: {
    fontWeight: "bold",
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
  },
  colorPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  colorBox: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  colorCode: {
    fontFamily: "monospace",
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: "#4DABF7",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  saveText: {
    color: "white",
    fontWeight: "bold",
  },
  deleteButton: {
    marginTop: 16,
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  deleteText: {
    color: "white",
    fontWeight: "bold",
  },
});
