// src/components/GlasswarePicker.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import { GLASSWARE } from "../constants/glassware";

const CELL = 86; // розмір картки
const GAP = 12;

// Сіра заглушка (без ініціалів/ікони)
const Photo = ({ source }) => {
  const theme = useTheme();
  if (source) {
    return (
      <Image
        source={source}
        style={[
          styles.photo,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
        resizeMode="contain"
      />
    );
  }
  return (
    <View
      style={[
        styles.photo,
        {
          backgroundColor: theme.colors.outlineVariant,
          borderColor: theme.colors.outline,
        },
      ]}
    />
  );
};

export default function GlasswarePicker({
  visible,
  value, // обраний id (string | null)
  onSelect, // (id) => void
  onClose, // () => void
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return GLASSWARE;
    return GLASSWARE.filter((g) => g.name.toLowerCase().includes(s));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Select glass
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          placeholder="Search..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.search,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          returnKeyType="search"
        />

        {/* Grid */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: GAP }}
          renderItem={({ item }) => {
            const selected = item.id === value;
            return (
              <Pressable
                onPress={() => {
                  onSelect?.(item.id);
                  onClose?.();
                }}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.outline,
                  },
                  pressed && {
                    opacity: 0.8,
                    transform: [{ scale: Platform.OS === "ios" ? 0.98 : 0.99 }],
                  },
                ]}
              >
                <Photo source={item.image} />
                <Text
                  numberOfLines={2}
                  style={[styles.caption, { color: theme.colors.onSurface }]}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", flex: 1 },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 6 },

  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  cell: {
    width: CELL,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    marginBottom: GAP,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  caption: { fontSize: 12, textAlign: "center" },
});
