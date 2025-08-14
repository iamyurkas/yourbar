import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Portal,
  Modal,
  Dialog,
  Divider,
  Chip,
  useTheme,
} from "react-native-paper";
import { getUserTags, saveUserTags } from "../storage/ingredientTagsStorage";

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

export default function IngredientTagsModal({ visible, onClose, autoAdd = false }) {
  const theme = useTheme();
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

  useEffect(() => {
    if (visible && autoAdd) {
      openAdd();
    }
  }, [visible, autoAdd]);

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
    <View style={[styles.row, { borderBottomColor: theme.colors.outline }]}>
      <View style={styles.left}>
        <View
          style={[
            styles.swatch,
            { backgroundColor: item.color || "#ccc", borderColor: theme.colors.outlineVariant },
          ]}
        />
        <View style={styles.tagTextBox}>
          <Text style={[styles.tagName, { color: theme.colors.onSurface }]}>{item.name}</Text>
          <Text style={[styles.tagColorCode, { color: theme.colors.onSurfaceVariant }]}>{item.color}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} accessibilityLabel="Edit tag" />
        <IconButton icon="delete" size={20} onPress={() => onDelete(item)} accessibilityLabel="Delete tag" />
      </View>
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Custom Tags</Text>
          <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}> 
          Create, edit, or remove your own ingredient tags.
        </Text>

        <Button
          mode="contained"
          onPress={openAdd}
          style={styles.addBtn}
          icon="plus"
        >
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
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>You don't have any custom tags yet.</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ maxHeight: 400 }}
        />
      </Modal>

      <Dialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Dialog.Title>{editingId ? "Edit tag" : "New tag"}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            error={!!nameError}
            style={{ marginBottom: 8 }}
            theme={{
              colors: {
                error: theme.colors.error,
                errorContainer: theme.colors.errorContainer,
              },
            }}
          />
          {nameError ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{nameError}</Text>
          ) : null}

          <Text style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>Color</Text>
          <View style={styles.palette}>
            {COLOR_PALETTE.map((c) => {
              const selected = c.toLowerCase() === (color || "").toLowerCase();
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selected && { borderColor: theme.colors.onSurface },
                  ]}
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
            theme={{
              colors: {
                error: theme.colors.error,
                errorContainer: theme.colors.errorContainer,
              },
            }}
          />
          {!isValidHex ? (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>Enter a valid hex color</Text>
          ) : null}

          <View style={styles.previewBox}>
            <Text style={{ marginBottom: 8, color: theme.colors.onSurface }}>Preview</Text>
            <Chip
              selected
              style={{ backgroundColor: color || "#ccc" }}
              textStyle={{ color: "#fff", fontWeight: "700" }}
            >
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
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { marginBottom: 12 },
  addBtn: { alignSelf: "flex-start", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagTextBox: { flexDirection: "column" },
  tagName: { fontSize: 16, fontWeight: "600" },
  tagColorCode: { fontSize: 12 },
  errorText: { marginTop: -4, marginBottom: 6 },
  sectionLabel: { fontWeight: "600", marginBottom: 6, marginTop: 4 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  previewBox: { marginTop: 10, marginBottom: 4 },
  emptyBox: { paddingVertical: 24, alignItems: "center" },
  emptyText: {},
});

