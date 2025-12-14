import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export default function SideMenu({ visible, onClose }) {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -MENU_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [visible, slideAnim]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menu,
            {
              width: MENU_WIDTH,
              backgroundColor: theme.colors.background,
              transform: [{ translateX: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  menu: {
    height: "100%",
  },
});
