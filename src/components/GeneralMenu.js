import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Checkbox } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import IngredientIcon from "../../assets/lemon.svg";
import CocktailIcon from "../../assets/cocktail.svg";

import IngredientTagsModal from "./IngredientTagsModal";
import CocktailTagsModal from "./CocktailTagsModal";
import FavoritesRatingModal from "./FavoritesRatingModal";
import StartScreenModal from "./StartScreenModal";
import ConfirmationDialog from "./ConfirmationDialog";
import useIngredientsData from "../hooks/useIngredientsData";
import { exportAllData, importAllData, exportAllPhotos } from "../storage/backupStorage";
import { useTheme } from "react-native-paper";

import {
  getUseMetric,
  setUseMetric as saveUseMetric,
  getIgnoreGarnish,
  setIgnoreGarnish as saveIgnoreGarnish,
  getKeepAwake,
  setKeepAwake as saveKeepAwake,
  getFavoritesMinRating,
  setFavoritesMinRating as saveFavoritesMinRating,
  getTabsOnTop,
  setTabsOnTop as saveTabsOnTop,
  addTabsOnTopListener,
  getAllowSubstitutes,
  setAllowSubstitutes as saveAllowSubstitutes,
  getStartScreen,
  setStartScreen as saveStartScreen,
} from "../storage/settingsStorage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export default function GeneralMenu({ visible, onClose }) {
  const showExportItems = true;
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;

  const theme = useTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: theme.colors.backdrop,
          justifyContent: "flex-start",
          alignItems: "flex-start",
        },
        menu: {
          height: "100%",
          backgroundColor: theme.colors.background,
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
          borderBottomColor: theme.colors.outline,
        },
        linkRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.outline,
        },
        itemText: {
          flex: 1,
          marginLeft: 8,
        },
        itemTitle: {
          fontSize: 16,
          color: theme.colors.onSurface,
          fontWeight: "500",
        },
        itemSub: {
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
          marginTop: 2,
        },
        linkIcon: { marginRight: 8 },
        chevron: { marginLeft: 8 },
      }),
    [theme]
  );

  const [ignoreGarnish, setIgnoreGarnish] = useState(true);
  const [useMetric, setUseMetric] = useState(true);
  const [keepAwake, setKeepAwake] = useState(true);
  const [tabsOnTop, setTabsOnTop] = useState(true);
  const [allowSubstitutes, setAllowSubstitutes] = useState(true);
  const [tagsVisible, setTagsVisible] = useState(false);
  const [cocktailTagsVisible, setCocktailTagsVisible] = useState(false);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [favRating, setFavRating] = useState(0);
  const [startScreen, setStartScreen] = useState("cocktails:All");
  const [startVisible, setStartVisible] = useState(false);
  const [dialog, setDialog] = useState({ visible: false, title: "", message: "" });

  const { refresh } = useIngredientsData();

  const startLabels = {
    "cocktails:All": "Cocktails - All",
    "cocktails:My": "Cocktails - My",
    "cocktails:Favorite": "Cocktails - Favorites",
    "ingredients:All": "Ingredients - All",
    "ingredients:My": "Ingredients - My",
    "ingredients:Shopping": "Ingredients - Shopping",
  };

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

  const openCocktailTagsModal = () => {
    onClose?.();
    setCocktailTagsVisible(true);
  };

  const openRatingModal = () => {
    onClose?.();
    setTimeout(() => setRatingVisible(true), 0);
  };

  const openStartScreenModal = () => {
    onClose?.();
    setTimeout(() => setStartVisible(true), 0);
  };

  const handleExportPhotos = async () => {
    onClose?.();
    try {
      await exportAllPhotos();
      setDialog({
        visible: true,
        title: "Export photos",
        message: "Photos exported successfully",
      });
    } catch (e) {
      setDialog({
        visible: true,
        title: "Export photos",
        message: "Failed to export photos",
      });
    }
  };

  const handleExport = async () => {
    onClose?.();
    try {
      await exportAllData();
      setDialog({ visible: true, title: "Export", message: "Data exported successfully" });
    } catch (e) {
      setDialog({ visible: true, title: "Export", message: "Failed to export data" });
    }
  };

  const handleImport = async () => {
    onClose?.();
    try {
      const ok = await importAllData();
      if (ok) {
        await refresh?.();
        setDialog({ visible: true, title: "Import", message: "Data imported successfully" });
      }
    } catch (e) {
      setDialog({ visible: true, title: "Import", message: "Failed to import data" });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await getUseMetric();
        setUseMetric(!!stored);
      } catch {}
    })();
    (async () => {
      try {
        const stored = await getIgnoreGarnish();
        setIgnoreGarnish(!!stored);
      } catch {}
    })();
    (async () => {
      try {
        const stored = await getAllowSubstitutes();
        setAllowSubstitutes(!!stored);
      } catch {}
    })();
    (async () => {
      try {
        const stored = await getKeepAwake();
        setKeepAwake(!!stored);
      } catch {}
    })();
    (async () => {
      try {
        const stored = await getFavoritesMinRating();
        setFavRating(stored);
      } catch {}
    })();
    (async () => {
      try {
        const stored = await getStartScreen();
        setStartScreen(stored || "cocktails:All");
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    getTabsOnTop().then((stored) => {
      if (mounted) setTabsOnTop(!!stored);
    });
    const sub = addTabsOnTopListener((v) => setTabsOnTop(!!v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const toggleUseMetric = () => {
    setUseMetric((v) => {
      const next = !v;
      saveUseMetric(next);
      return next;
    });
  };

  const toggleIgnoreGarnish = () => {
    setIgnoreGarnish((v) => {
      const next = !v;
      saveIgnoreGarnish(next);
      return next;
    });
  };

  const toggleAllowSubstitutes = () => {
    setAllowSubstitutes((v) => {
      const next = !v;
      saveAllowSubstitutes(next);
      return next;
    });
    refresh?.();
  };

  const toggleKeepAwake = () => {
    setKeepAwake((v) => {
      const next = !v;
      saveKeepAwake(next);
      return next;
    });
  };

  const toggleTabsOnTop = () => {
    setTabsOnTop((v) => {
      const next = !v;
      saveTabsOnTop(next);
      return next;
    });
  };

  const handleSelectRating = (value) => {
    setFavRating(value);
    saveFavoritesMinRating(value);
  };

  const handleSelectStart = (value) => {
    setStartScreen(value);
    saveStartScreen(value);
  };

  const closeTagsModal = () => setTagsVisible(false);
  const closeCocktailTagsModal = () => setCocktailTagsVisible(false);

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
            <ScrollView
            style={{ marginTop:-32 }}>
              <Text style={styles.title}>Settings</Text>

              <View style={styles.itemRow}>
                <Checkbox
                  status={ignoreGarnish ? "checked" : "unchecked"}
                  onPress={toggleIgnoreGarnish}
                />
                <Pressable style={styles.itemText} onPress={toggleIgnoreGarnish}>
                  <Text style={styles.itemTitle}>Ignore garnishes</Text>
                  <Text style={styles.itemSub}>All garnishes are optional</Text>
                </Pressable>
              </View>

              <View style={styles.itemRow}>
                <Checkbox
                  status={allowSubstitutes ? "checked" : "unchecked"}
                  onPress={toggleAllowSubstitutes}
                />
                <Pressable
                  style={styles.itemText}
                  onPress={toggleAllowSubstitutes}
                >
                  <Text style={styles.itemTitle}>Always allow substitutes</Text>
                  <Text style={styles.itemSub}>
                    Use base or branded alternatives regardless of recipe
                  </Text>
                </Pressable>
              </View>

              <View style={styles.itemRow}>
                <Checkbox
                  status={useMetric ? "checked" : "unchecked"}
                  onPress={toggleUseMetric}
                />
                <Pressable style={styles.itemText} onPress={toggleUseMetric}>
                  <Text style={styles.itemTitle}>Use metric system</Text>
                  <Text style={styles.itemSub}>Uncheck to use U.S. units</Text>
                </Pressable>
              </View>

              <View style={styles.itemRow}>
                <Checkbox
                  status={keepAwake ? "checked" : "unchecked"}
                  onPress={toggleKeepAwake}
                />
                <Pressable
                  style={styles.itemText}
                  onPress={toggleKeepAwake}
                >
                  <Text style={styles.itemTitle}>Keep screen awake</Text>
                  <Text style={styles.itemSub}>
                    Prevent the phone from sleeping while viewing cocktail details
                  </Text>
                </Pressable>
              </View>

              <View style={styles.itemRow}>
                <Checkbox
                  status={tabsOnTop ? "checked" : "unchecked"}
                  onPress={toggleTabsOnTop}
                />
                <Pressable style={styles.itemText} onPress={toggleTabsOnTop}>
                  <Text style={styles.itemTitle}>Tabs on top</Text>
                  <Text style={styles.itemSub}>Uncheck to show tabs at bottom</Text>
                </Pressable>
              </View>

              <TouchableOpacity style={styles.linkRow} onPress={openRatingModal}>
                <MaterialIcons
                  name="star"
                  size={22}
                  color={theme.colors.primary}
                  style={styles.linkIcon}
                />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>Favorites rating</Text>
                  {favRating ? (
                    <Text style={styles.itemSub}>
                      Only show cocktails with at least {favRating} star
                      {favRating === 1 ? "" : "s"}
                    </Text>
                  ) : (
                    <Text style={styles.itemSub}>Show all favorite cocktails</Text>
                  )}
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkRow}
                onPress={openStartScreenModal}
              >
                <MaterialIcons
                  name="home"
                  size={22}
                  color={theme.colors.primary}
                  style={styles.linkIcon}
                />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>Start screen</Text>
                  <Text style={styles.itemSub}>{startLabels[startScreen]}</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openTagsModal}>
                <IngredientIcon
                  width={22}
                  height={22}
                  fill={theme.colors.primary}
                  style={styles.linkIcon}
                />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>Ingredient tags</Text>
                  <Text style={styles.itemSub}>Create, edit or remove ingredient tags</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkRow} onPress={openCocktailTagsModal}>
                <CocktailIcon
                  width={22}
                  height={22}
                  fill={theme.colors.primary}
                  style={styles.linkIcon}
                />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>Cocktail tags</Text>
                  <Text style={styles.itemSub}>Create, edit or remove cocktail tags</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              </TouchableOpacity>

              {showExportItems && (
                <TouchableOpacity style={styles.linkRow} onPress={handleExportPhotos}>
                  <MaterialIcons
                    name="photo-library"
                    size={22}
                    color={theme.colors.primary}
                    style={styles.linkIcon}
                  />
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>Export photos</Text>
                    <Text style={styles.itemSub}>Export all ingredient and cocktail photos</Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              )}

              {showExportItems && (
                <TouchableOpacity style={styles.linkRow} onPress={handleExport}>
                  <MaterialIcons
                    name="file-download"
                    size={22}
                    color={theme.colors.primary}
                    style={styles.linkIcon}
                  />
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>Export data</Text>
                    <Text style={styles.itemSub}>Export all ingredients and cocktails</Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              )}

              {showExportItems && (
                <TouchableOpacity style={styles.linkRow} onPress={handleImport}>
                  <MaterialIcons
                    name="file-upload"
                    size={22}
                    color={theme.colors.primary}
                    style={styles.linkIcon}
                  />
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>Import data</Text>
                    <Text style={styles.itemSub}>Import ingredients and cocktails</Text>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
      <IngredientTagsModal visible={tagsVisible} onClose={closeTagsModal} />
      <CocktailTagsModal
        visible={cocktailTagsVisible}
        onClose={closeCocktailTagsModal}
      />
      <FavoritesRatingModal
        visible={ratingVisible}
        rating={favRating}
        onSelect={handleSelectRating}
        onClose={() => setRatingVisible(false)}
      />
      <StartScreenModal
        visible={startVisible}
        value={startScreen}
        onSelect={handleSelectStart}
        onClose={() => setStartVisible(false)}
      />
      <ConfirmationDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onCancel={() => setDialog((d) => ({ ...d, visible: false }))}
        actions={[
          {
            label: "OK",
            mode: "contained",
            onPress: () => setDialog((d) => ({ ...d, visible: false })),
          },
        ]}
      />
    </>
  );
}
