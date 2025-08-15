import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Menu, useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

export default function SortMenu({ order = "desc", onChange }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const select = (o) => {
    onChange?.(o);
    setVisible(false);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={{ paddingVertical: 4, paddingHorizontal: 2 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8, borderRadius: 16 }}
        >
          <MaterialIcons
            name="sort"
            size={28}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      }
      anchorPosition="bottom"
      contentStyle={{
        paddingHorizontal: 4,
        paddingVertical: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
      }}
    >
      <Menu.Item
        onPress={() => select("asc")}
        title="Rating: Low to High"
        leadingIcon={
          order === "asc"
            ? () => (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              )
            : undefined
        }
      />
      <Menu.Item
        onPress={() => select("desc")}
        title="Rating: High to Low"
        leadingIcon={
          order === "desc"
            ? () => (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              )
            : undefined
        }
      />
    </Menu>
  );
}
