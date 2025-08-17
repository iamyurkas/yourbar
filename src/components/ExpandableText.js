import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function ExpandableText({ text, numberOfLines = 4, style }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);

  const onTextLayout = useCallback(
    (e) => {
      setShowToggle(e.nativeEvent.lines.length > numberOfLines);
    },
    [numberOfLines]
  );

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <View>
      <Text
        onTextLayout={onTextLayout}
        numberOfLines={expanded ? undefined : numberOfLines}
        style={style}
      >
        {text}
      </Text>
      {showToggle ? (
        <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={[style, styles.toggle, { color: theme.colors.primary }]}>
            {expanded ? "Show less" : "Show more"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { marginTop: 4 },
});

