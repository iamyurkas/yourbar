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
import { BUILTIN_INGREDIENT_TAGS } from "../constants/ingredientTags";
import { useNavigation } from "@react-navigation/native";
import WheelColorPicker from "react-native-wheel-color-picker";
import { useTheme } from "react-native-paper";
import { TAG_COLORS } from "../theme";

export default function AddTagScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Please enter a name for the tag.");
      return;
    }

    const existingUserTags = await getUserTags();
    const existingIds = [...BUILTIN_INGREDIENT_TAGS, ...existingUserTags].map(
      (t) => t.id
    );
    const newId = Math.max(...existingIds) + 1;

    const newTag = { id: newId, name: name.trim(), color };
    const updatedTags = [...existingUserTags, newTag];

    await saveUserTags(updatedTags);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.label}>Tag name:</Text>
      <TextInput
        placeholder="e.g. bitters"
        value={name}
        onChangeText={setName}
        style={[styles.input, { borderColor: theme.colors.outline }]}
      />

      <Text style={styles.label}>Choose color:</Text>
      <View style={styles.colorPreview}>
        <View
          style={[
            styles.colorBox,
            { backgroundColor: color, borderColor: theme.colors.onSurface },
          ]}
        />
        <Text style={styles.colorCode}>{color}</Text>
      </View>

      <WheelColorPicker
        color={color}
        onColorChange={setColor}
        thumbStyle={{ borderWidth: 2, borderColor: theme.colors.onSurface }}
        style={{ height: 240, marginBottom: 16 }}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveText, { color: theme.colors.onPrimary }]}>Save Tag</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
  },
  label: {
    fontWeight: "bold",
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
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
  },
  colorCode: {
    fontFamily: "monospace",
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  saveText: {
    fontWeight: "bold",
  },
});
