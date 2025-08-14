import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Portal, Dialog, TextInput, Button, Text } from "react-native-paper";

// Simple palette for tag colors
const COLOR_PALETTE = [
  "#FF6B6B",
  "#FF8787",
  "#FFA94D",
  "#FFD43B",
  "#69DB7C",
  "#38D9A9",
  "#4DABF7",
  "#9775FA",
  "#8AADCFFF",
  "#AFC9C3FF",
  "#F06595",
  "#20C997",
];

export default function TagModal({ visible, onDismiss, onSave }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  const reset = () => {
    setName("");
    setColor(COLOR_PALETTE[0]);
  };

  const handleDismiss = () => {
    reset();
    onDismiss && onDismiss();
  };

  const handleSave = () => {
    const n = name.trim();
    if (!n) return;
    onSave && onSave({ name: n, color });
    handleDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>New tag</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.palette}>
            {COLOR_PALETTE.map((c) => {
              const selected = c === color;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selected && styles.colorDotSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              );
            })}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button onPress={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    margin: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#333",
  },
  sectionLabel: { fontWeight: "600", marginBottom: 6 },
});
