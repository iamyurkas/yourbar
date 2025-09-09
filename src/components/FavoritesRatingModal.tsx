import React from "react";
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

export default function FavoritesRatingModal({
  visible,
  rating = 0,
  onSelect,
  onClose,
}) {
  const theme = useTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: theme.colors.backdrop,
          justifyContent: "center",
          alignItems: "center",
        },
        box: {
          padding: 24,
          borderRadius: 8,
          backgroundColor: theme.colors.background,
          width: 280,
          alignItems: "center",
        },
        title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
        subtitle: {
          fontSize: 14,
          color: theme.colors.onSurfaceVariant,
          textAlign: "center",
          marginBottom: 16,
        },
        starsRow: { flexDirection: "row" },
      }),
    [theme]
  );
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.box} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Favorites minimum rating</Text>
          <Text style={styles.subtitle}>
            Only show cocktails with at least this many stars
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => onSelect?.(value === rating ? 0 : value)}
              >
                <MaterialIcons
                  name={value <= rating ? "star" : "star-border"}
                  size={32}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
