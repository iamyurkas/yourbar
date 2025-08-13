import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Menu, useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

export default function TagFilterMenu({ tags = [], selected = [], setSelected }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={{ paddingVertical: 4, paddingHorizontal: 2 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="filter-list"
            size={28}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      }
    >
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        return (
          <Menu.Item
            key={tag.id}
            onPress={() => toggle(tag.id)}
            title={tag.name}
            style={active ? { backgroundColor: tag.color } : null}
            titleStyle={{ color: active ? "white" : theme.colors.onSurface }}
            leadingIcon={active ? "check" : undefined}
          />
        );
      })}
    </Menu>
  );
}

