import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal } from "react-native";
import {
  Provider as PaperProvider,
  Text,
  TextInput,
  Button,
  IconButton,
  Portal,
  Dialog,
  Divider,
  Chip,
  MD3LightTheme as BaseTheme,
} from "react-native-paper";
import { getUserTags, saveUserTags } from "../storage/ingredientTagsStorage";

// Theme setup
const theme = {
  ...BaseTheme,
  version: 3,
  colors: {
    ...BaseTheme.colors,
    primary: "#4DABF7",
    background: "#FFFFFF",
    surface: "#ecececff",
    outline: "#E5EAF0",
    outlineVariant: "#E9EEF4",
    error: "#FF6B6B",
    errorContainer: "#FFE3E6",
    onError: "#FFFFFF",
    onErrorContainer: "#7A1C1C",
    onPrimary: "#FFFFFF",
    onBackground: "#000000",
    onSurface: "#000000",
    secondary: "#74C0FC",
    tertiary: "#A5D8FF",
    disabled: "#CED4DA",
    placeholder: "#A1A1A1",
    backdrop: "rgba(0,0,0,0.4)",
  },
};

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

export default function IngredientTagsModal({ visible, onClose }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const data = await getUserTags();
      setTags(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, [visible]);

  const resetDialog = () => {
    setEditingId(null);
    setName("");
    setColor(COLOR_PALETTE[0]);
  };

  const openAdd = () => {
    resetDialog();
    setDialogVisible(true);
  };

  const openEdit = (tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color || COLOR_PALETTE[0]);
    setDialogVisible(true);
  };

  const onDelete = (tag) => {
    Alert.alert(
      "Delete tag",
      `Are you sure you want to delete “${tag.name}”?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const next = tags.filter((t) => t.id !== tag.id);
            setTags(next);
            await saveUserTags(next);
          },
        },
      ]
    );
  };

  const isValidHex = useMemo(() => {
    const v = color?.trim() || "";
    return /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
  }, [color]);

  const nameError = useMemo(() => {
    const n = name.trim();
    if (!n) return "Name is required";
    const dup = tags.some(
      (t) =>
        t.name.toLowerCase() === n.toLowerCase() &&
        (editingId ? t.id !== editingId : true)
    );
    if (dup) return "Tag with this name already exists";
    return null;
  }, [name, tags, editingId]);

  const canSave = !nameError && isValidHex;

  const onSave = async () => {
    const n = name.trim();
    if (!canSave) return;
    let next;
    if (editingId) {
      next = tags.map((t) =>
        t.id === editingId ? { ...t, name: n, color } : t
      );
    } else {
      const id = Date.now();
      next = [...tags, { id, name: n, color }];
    }
    setTags(next);
    await saveUserTags(next);
    setDialogVisible(false);
    resetDialog();
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.swatch, { backgroundColor: item.color || "#ccc" }]} />
        <View style={styles.tagTextBox}>
          <Text style={styles.tagName}>{item.name}</Text>
          <Text style={styles.tagColorCode}>{item.color}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} accessibilityLabel="Edit tag" />
        <IconButton icon="delete" size={20} onPress={() => onDelete(item)} accessibilityLabel="Delete tag" />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <PaperProvider theme={theme}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Custom Tags</Text>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
          </View>
          <Text style={styles.subtitle}>
            Create, edit, or remove your own ingredient tags.
          </Text>

          <Button mode="contained" onPress={openAdd} style={styles.addBtn} icon="plus">
            Add new tag
          </Button>

          <Divider />

          <FlatList
            data={tags}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    You don’t have any custom tags yet.
                  </Text>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </View>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
            <Dialog.Title>{editingId ? "Edit tag" : "New tag"}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Name"
                mode="outlined"
                value={name}
                onChangeText={setName}
                error={!!nameError}
                style={{ marginBottom: 8 }}
                theme={{ colors: { error: theme.colors.error, errorContainer: theme.colors.errorContainer } }}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

              <Text style={styles.sectionLabel}>Color</Text>
              <View style={styles.palette}>
                {COLOR_PALETTE.map((c) => {
                  const selected = c.toLowerCase() === (color || "").toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, selected && styles.colorDotSelected]}
                      onPress={() => setColor(c)}
                      accessibilityLabel={`Pick color ${c}`}
                    />
                  );
                })}
              </View>

              <TextInput
                label="HEX (#RRGGBB or #RRGGBBAA)"
                mode="outlined"
                value={color}
                onChangeText={setColor}
                error={!isValidHex}
                theme={{ colors: { error: theme.colors.error, errorContainer: theme.colors.errorContainer } }}
              />
              {!isValidHex ? (
                <Text style={styles.errorText}>Enter a valid hex color</Text>
              ) : null}

              <View style={styles.previewBox}>
                <Text style={{ marginBottom: 8 }}>Preview</Text>
                <Chip selected style={{ backgroundColor: color || "#ccc" }} textStyle={{ color: "#fff", fontWeight: "700" }}>
                  {name || "Tag name"}
                </Chip>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button onPress={onSave} disabled={!canSave}>
                Save
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </PaperProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#666", marginBottom: 12 },
  addBtn: { alignSelf: "flex-start", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  tagTextBox: { flexDirection: "column" },
  tagName: { fontSize: 16, fontWeight: "600", color: "#111" },
  tagColorCode: { fontSize: 12, color: "#6c757d" },
  errorText: { color: "#FF6B6B", marginTop: -4, marginBottom: 6 },
  sectionLabel: { fontWeight: "600", marginBottom: 6, marginTop: 4 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  colorDotSelected: { borderColor: "#333" },
  previewBox: { marginTop: 10, marginBottom: 4 },
  emptyBox: { paddingVertical: 24, alignItems: "center" },
  emptyText: { color: "#666" },
});

