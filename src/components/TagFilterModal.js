import React from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Portal, Modal, Button, useTheme } from "react-native-paper";

export default function TagFilterModal({ visible, onClose, tags = [], selected = [], setSelected }) {
  const theme = useTheme();

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{
          backgroundColor: theme.colors.background,
          margin: 20,
          padding: 20,
          borderRadius: 8,
        }}
      >
        <ScrollView contentContainerStyle={styles.tagContainer}>
          {tags.map((tag) => {
            const active = selected.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                onPress={() => toggle(tag.id)}
                style={[
                  styles.tag,
                  {
                    backgroundColor: active
                      ? tag.color
                      : theme.colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: active ? "white" : theme.colors.onSurface },
                  ]}
                >
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={{ alignItems: "flex-end" }}>
          <Button onPress={onClose}>Close</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: {
    fontWeight: "bold",
  },
});

