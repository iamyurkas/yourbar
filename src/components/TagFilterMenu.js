import React, { useState, useMemo } from "react";
import {
  TouchableOpacity,
  View,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { Menu, useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

export default function TagFilterMenu({
  tags = [],
  selected = [],
  setSelected,
}) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const iconColor = useMemo(() => {
    if (selected.length === 0) return theme.colors.onSurface;
    const last = selected[selected.length - 1];
    const tag = tags.find((t) => t.id === last);
    return tag?.color ?? theme.colors.onSurface;
  }, [selected, tags, theme]);

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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8, borderRadius: 16 }}
        >
          <MaterialIcons name="filter-list" size={28} color={iconColor} />
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
      <View style={styles.tagContainer}>
        {tags.map((tag) => {
          const active = selected.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              onPress={() => toggle(tag.id)}
              android_ripple={{ color: theme.colors.tertiary }}
              style={[
                styles.tag,
                active
                  ? { backgroundColor: tag.color }
                  : {
                      backgroundColor: theme.colors.surface,
                      borderColor: tag.color,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: active
                      ? theme.colors.onPrimary
                      : theme.colors.onSurface,
                  },
                ]}
              >
                {tag.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Menu>
  );
}

const styles = StyleSheet.create({
  tagContainer: {
    maxWidth: 220,
    alignItems: "flex-start",
    borderRadius: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 4,
    marginHorizontal: 4,
    alignSelf: "flex-start",
  },
  tagText: { fontWeight: "bold" },
});
