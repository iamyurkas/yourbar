import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

interface Props {
  height: number;
  imageSize: number;
  count?: number;
}

export default function ListSkeleton({ height, imageSize, count = 8 }: Props) {
  const theme = useTheme();
  const bg = theme.colors.surfaceVariant;
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.row,
            {
              height,
              borderBottomColor: theme.colors.background,
            },
          ]}
        >
          <View
            style={[styles.image, { width: imageSize, height: imageSize, backgroundColor: bg }]}
          />
          <View style={styles.textBlock}>
            <View style={[styles.line, { width: "60%", backgroundColor: bg }]} />
            <View
              style={[styles.line, { width: "40%", backgroundColor: bg, marginTop: 6 }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  image: {
    borderRadius: 4,
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  line: {
    height: 14,
    borderRadius: 4,
  },
});

