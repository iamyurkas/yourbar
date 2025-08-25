import React, { useMemo, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import GeneralMenu from "./GeneralMenu";

export default function HeaderWithSearch({
  onMenu,
  onSearch,
  onFilter,
  searchValue,
  setSearchValue,
  filterComponent,
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = () => {
    if (onMenu) {
      onMenu();
    } else {
      setMenuVisible(true);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 0 }}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={handleMenuPress}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="menu" size={28} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.onSurfaceVariant}
            style={{ marginLeft: 6 }}
          />
          <TextInput
            placeholder="Search"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchValue}
            onChangeText={setSearchValue}
            onSubmitEditing={() => onSearch?.(searchValue)}
            returnKeyType="search"
            style={styles.input}
          />
          {searchValue?.length ? (
            <TouchableOpacity
              onPress={() => setSearchValue("")}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons
                name="close"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {filterComponent ? (
          filterComponent
        ) : (
          <TouchableOpacity
            onPress={onFilter}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="filter-list"
              size={28}
              color={theme.colors.onSurface}
            />
          </TouchableOpacity>
        )}
      </View>
      <GeneralMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      
      backgroundColor: theme.colors.background,
      gap: 10,
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.background,
    },
    input: {
      flex: 1,
      marginLeft: 6,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    iconBtn: {
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    clearBtn: {
      padding: 4,
    },
  });
