// src/screens/EditCustomTagsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
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
} from "react-native-paper";

import { getUserTags, saveUserTags } from "../../storage/ingredientTagsStorage";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { AppTheme, TAG_COLORS } from "../../theme";

export default function EditCustomTagsScreen() {
  const theme = AppTheme;
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [deleteTag, setDeleteTag] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await getUserTags();
      setTags(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, []);

  const resetDialog = () => {
    setEditingId(null);
    setName("");
    setColor(TAG_COLORS[0]);
  };

  const openAdd = () => {
    resetDialog();
    setDialogVisible(true);
  };

  const openEdit = (tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color || TAG_COLORS[0]);
    setDialogVisible(true);
  };

  const onDelete = (tag) => {
    setDeleteTag(tag);
  };

  // simple HEX check #RRGGBB / #RRGGBBAA
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
        <View
          style={[
            styles.swatch,
            { backgroundColor: item.color || theme.colors.surfaceVariant },
          ]}
        />
        <View style={styles.tagTextBox}>
          <Text style={styles.tagName}>{item.name}</Text>
          <Text style={styles.tagColorCode}>{item.color}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <IconButton
          icon="pencil"
          size={20}
          onPress={() => openEdit(item)}
          accessibilityLabel="Edit tag"
        />
        <IconButton
          icon="delete"
          size={20}
          onPress={() => onDelete(item)}
          accessibilityLabel="Delete tag"
        />
      </View>
    </View>
  );

  // Рендер зі своєю темою
  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <Text style={styles.title}>Custom Tags</Text>
        <Text style={styles.subtitle}>
          Create, edit, or remove ingredient tags
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
              // 👇 на випадок, якщо десь екран обгорнуто іншою темою
              theme={{
                colors: {
                  error: theme.colors.error,
                  errorContainer: theme.colors.errorContainer,
                },
              }}
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}

            <Text style={styles.sectionLabel}>Color</Text>

            {/* Палітра кольорів */}
            <View style={styles.palette}>
          {TAG_COLORS.map((c) => {
                const selected =
                  c.toLowerCase() === (color || "").toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      selected && styles.colorDotSelected,
                    ]}
                    onPress={() => setColor(c)}
                    accessibilityLabel={`Pick color ${c}`}
                  />
                );
              })}
            </View>

            {/* Ручне введення HEX */}
            <TextInput
              label="HEX (#RRGGBB or #RRGGBBAA)"
              mode="outlined"
              value={color}
              onChangeText={setColor}
              error={!isValidHex}
              left={<TextInput.Affix text="" />}
              theme={{
                colors: {
                  error: theme.colors.error,
                  errorContainer: theme.colors.errorContainer,
                },
              }}
            />
            {!isValidHex ? (
              <Text style={styles.errorText}>Enter a valid hex color</Text>
            ) : null}

            {/* Прев’ю */}
            <View style={styles.previewBox}>
              <Text style={{ marginBottom: 8 }}>Preview</Text>
              <Chip
                selected
                style={{ backgroundColor: color || theme.colors.surfaceVariant }}
                textStyle={{
                  color: theme.colors.onPrimary,
                  fontWeight: "700",
                }}
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
      <ConfirmationDialog
        visible={!!deleteTag}
        title="Delete tag"
        message={`Are you sure you want to delete “${deleteTag?.name}”?`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTag(null)}
        onConfirm={async () => {
          const next = tags.filter((t) => t.id !== deleteTag.id);
          setTags(next);
          await saveUserTags(next);
          setDeleteTag(null);
        }}
      />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: AppTheme.colors.onSurface,
  },
  subtitle: { color: AppTheme.colors.onSurfaceVariant, marginBottom: 12 },
  addBtn: { alignSelf: "flex-start", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppTheme.colors.outline,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppTheme.colors.outlineVariant,
  },
  tagTextBox: { flexDirection: "column" },
  tagName: { fontSize: 16, fontWeight: "600", color: AppTheme.colors.onSurface },
  tagColorCode: {
    fontSize: 12,
    color: AppTheme.colors.onSurfaceVariant,
  },
  errorText: {
    color: AppTheme.colors.error,
    marginTop: -4,
    marginBottom: 6,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
    color: AppTheme.colors.onSurface,
  },
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: { borderColor: AppTheme.colors.onSurface },
  previewBox: { marginTop: 10, marginBottom: 4 },
  emptyBox: { paddingVertical: 24, alignItems: "center" },
  emptyText: { color: AppTheme.colors.onSurfaceVariant },
});
