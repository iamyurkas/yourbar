import React from "react";
import { View, StyleSheet } from "react-native";
import { Portal, Modal, Text, Button, useTheme } from "react-native-paper";

export default function ConfirmationDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  actions,
}) {
  const theme = useTheme();
  const btns =
    actions || [
      { label: cancelLabel, mode: "outlined", onPress: onCancel },
      { label: confirmLabel, mode: "contained", onPress: onConfirm },
    ];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        style={{ justifyContent: "flex-start" }}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
      >
        {title ? (
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        ) : null}
        {message ? (
          <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            {message}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          {btns.map((b, i) => (
            <Button
              key={i}
              mode={b.mode || "contained"}
              onPress={b.onPress}
              style={styles.button}
            >
              {b.label}
            </Button>
          ))}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 0,
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  message: { marginBottom: 16 },
  buttons: { flexDirection: "row", justifyContent: "flex-end" },
  button: { marginLeft: 8 },
});

