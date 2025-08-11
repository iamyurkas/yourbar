// src/components/UnitPicker.js
import React, { memo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { Menu, useTheme, Divider } from "react-native-paper";
import { MEASURE_UNITS } from "../constants/measureUnits";

const ROW_H = 48;

const UnitRow = memo(function UnitRow({ item, selected, onSelect }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onSelect(item.id)}
      android_ripple={{ color: theme.colors.outlineVariant }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface },
        pressed && { opacity: 0.96 },
      ]}
    >
      <Text
        style={{
          color: theme.colors.onSurface,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {/* маркер вибраного, як у твоєму прикладі (синя крапка) */}
      {selected ? (
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
      ) : null}
    </Pressable>
  );
});

export default function UnitPicker({
  visible,
  anchor, // {x, y}
  anchorWidth, // number
  value, // selected unit id
  onSelect,
  onDismiss,
}) {
  const theme = useTheme();

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor || { x: 0, y: 0 }}
      contentStyle={{
        width: anchorWidth || 260,
        backgroundColor: theme.colors.surface,
        paddingVertical: 6,
      }}
    >
      <FlatList
        data={MEASURE_UNITS}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item, index }) => (
          <>
            {/* перший елемент без дільника зверху */}
            {index > 0 ? <Divider style={{ opacity: 0.5 }} /> : null}
            <UnitRow
              item={item}
              selected={item.id === value}
              onSelect={(id) => {
                onSelect?.(id);
                onDismiss?.();
              }}
            />
          </>
        )}
        style={{
          height: Math.min(300, ROW_H * MEASURE_UNITS.length),
        }}
        getItemLayout={(_, i) => ({
          length: ROW_H,
          offset: ROW_H * i,
          index: i,
        })}
        keyboardShouldPersistTaps="handled"
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_H,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
