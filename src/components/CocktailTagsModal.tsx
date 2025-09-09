import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Portal,
  Modal,
  Divider,
  useTheme,
} from "react-native-paper";
import {
  getCustomCocktailTags,
  upsertCocktailTag,
  deleteCocktailTag,
} from "../data/cocktailTags";
import ConfirmationDialog from "./ConfirmationDialog";
import { TAG_COLORS } from "../theme";

const TOP_OFFSET = 0;

export default function CocktailTagsModal({ visible, onClose, autoAdd = false }) {
  const theme = useTheme();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [deleteTag, setDeleteTag] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const data = await getCustomCocktailTags();
      setTags(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, [visible]);

  const resetDialog = () => {
    setEditingId(null);
    setName("");
    setColor(TAG_COLORS[0]);
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
    setColor(tag.color || TAG_COLORS[0]);
    setDialogVisible(true);
  };

  const onDelete = (tag) => {
    setDeleteTag(tag);
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
    let tag;
    if (editingId) {
      tag = { id: editingId, name: n, color };
      setTags((prev) => prev.map((t) => (t.id === editingId ? tag : t)));
    } else {
      tag = { id: Date.now(), name: n, color };
      setTags((prev) => [...prev, tag]);
    }
    await upsertCocktailTag(tag);
    setDialogVisible(false);
    resetDialog();
  };

  const renderItem = ({ item }) => (
    <View style={[styles.row, { borderBottomColor: theme.colors.outline }]}> 
      <View style={styles.left}>
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: item.color || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
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
        style={{ justifyContent: "flex-start" }}
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Custom Tags</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Create, edit, or remove cocktail tags</Text>

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
                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>You don't have any custom tags yet.</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ maxHeight: 400 }}
        />
      </Modal>

      <Modal
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        style={{ justifyContent: "flex-start" }}
        contentContainerStyle={[
          styles.dialog,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <Text style={[styles.dialogTitle, { color: theme.colors.onSurface }]}>
          {editingId ? "Edit tag" : "New tag"}
        </Text>

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
          {TAG_COLORS.map((c) => {
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

        <Button mode="contained" onPress={onSave} disabled={!canSave} style={{ borderRadius: 8 }}>
          {editingId ? "Save" : "Add"}
        </Button>
      </Modal>

      <ConfirmationDialog
        visible={!!deleteTag}
        title="Delete tag"
        message={`Are you sure you want to delete “${deleteTag?.name}”?`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTag(null)}
        onConfirm={async () => {
          setTags((prev) => prev.filter((t) => t.id !== deleteTag.id));
          await deleteCocktailTag(deleteTag.id);
          setDeleteTag(null);
        }}
      />
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: TOP_OFFSET,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { marginBottom: 12 },
  addBtn: { marginVertical: 12, width: "100%", borderRadius: 8 },
  emptyBox: { paddingVertical: 24, alignItems: "center" },
  emptyText: {},
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
  dialog: {
    marginHorizontal: 24,
    marginTop: TOP_OFFSET,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dialogTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  errorText: { marginTop: -4, marginBottom: 6 },
  sectionLabel: { fontWeight: "600", marginBottom: 6, marginTop: 4 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
});
