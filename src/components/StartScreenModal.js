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

const OPTIONS = [
  { key: "cocktails:All", label: "Cocktails - All" },
  { key: "cocktails:My", label: "Cocktails - My" },
  { key: "cocktails:Favorite", label: "Cocktails - Favorites" },
  { key: "ingredients:All", label: "Ingredients - All" },
  { key: "ingredients:My", label: "Ingredients - My" },
  { key: "ingredients:Shopping", label: "Ingredients - Shopping" },
];

export default function StartScreenModal({ visible, value, onSelect, onClose }) {
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
        },
        title: { fontSize: 18, fontWeight: "600", marginBottom: 16, textAlign: "center" },
        option: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
        },
        optionText: { fontSize: 16 },
      }),
    [theme]
  );

  const handleSelect = (val) => {
    onSelect?.(val);
    onClose?.();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.box} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Start screen</Text>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.option}
              onPress={() => handleSelect(opt.key)}
            >
              <Text
                style={[
                  styles.optionText,
                  value === opt.key && { color: theme.colors.primary },
                ]}
              >
                {opt.label}
              </Text>
              {value === opt.key && (
                <MaterialIcons name="check" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
