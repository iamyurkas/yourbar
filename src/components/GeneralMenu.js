import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Checkbox } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import IngredientIcon from "../../assets/lemon.svg";

import IngredientTagsModal from "./IngredientTagsModal";

import { getUseMetric, setUseMetric as saveUseMetric } from "../storage/settingsStorage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export default function GeneralMenu({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;

  const [ignoreGarnish, setIgnoreGarnish] = useState(false);
  const [useMetric, setUseMetric] = useState(true);
  const [keepAwake, setKeepAwake] = useState(false);
  const [tagsVisible, setTagsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -MENU_WIDTH,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, slideAnim]);

  const openTagsModal = () => {
    onClose?.();
    setTagsVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await getUseMetric();
        setUseMetric(!!stored);
      } catch {}
    })();
  }, []);

  const toggleUseMetric = () => {
    setUseMetric((v) => {
      const next = !v;
      saveUseMetric(next);
      return next;
    });
  };

  const closeTagsModal = () => setTagsVisible(false);

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={onClose}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View
            style={[styles.menu, { width: MENU_WIDTH, transform: [{ translateX: slideAnim }] }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.title}>Settings</Text>

            <View style={styles.itemRow}>
              <Checkbox
                status={ignoreGarnish ? "checked" : "unchecked"}
                onPress={() => setIgnoreGarnish((v) => !v)}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Ignore garnishes</Text>
                <Text style={styles.itemSub}>All garnishes are optional</Text>
              </View>
            </View>

            <View style={styles.itemRow}>
              <Checkbox
                status={useMetric ? "checked" : "unchecked"}
                onPress={toggleUseMetric}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Use metric system</Text>
                <Text style={styles.itemSub}>Uncheck to use U.S. units</Text>
              </View>
            </View>

            <View style={styles.itemRow}>
              <Checkbox
                status={keepAwake ? "checked" : "unchecked"}
                onPress={() => setKeepAwake((v) => !v)}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Keep screen awake</Text>
                <Text style={styles.itemSub}>
                  Prevent the phone from sleeping while viewing cocktail details
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.linkRow} onPress={openTagsModal}>
              <IngredientIcon
                width={22}
                height={22}
                fill="#4DABF7"
                style={styles.linkIcon}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Ingredient tags</Text>
                <Text style={styles.itemSub}>Create, edit or remove ingredient tags</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color="#999"
                style={styles.chevron}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={() => {}}>
              <MaterialIcons
                name="local-bar"
                size={22}
                color="#4DABF7"
                style={styles.linkIcon}
              />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Cocktail tags</Text>
                <Text style={styles.itemSub}>Create, edit or remove cocktail tags</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color="#999"
                style={styles.chevron}
              />
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
      <IngredientTagsModal visible={tagsVisible} onClose={closeTagsModal} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  menu: {
    height: "100%",
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  itemText: {
    flex: 1,
    marginLeft: 8,
  },
  itemTitle: {
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  itemSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  linkIcon: {
    marginRight: 8,
  },
  chevron: {
    marginLeft: 8,
  },
});
