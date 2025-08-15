import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import GeneralMenu from "./GeneralMenu";

export default function MenuButton() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{ paddingHorizontal: 12, paddingVertical: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="menu" size={28} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <GeneralMenu visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}
