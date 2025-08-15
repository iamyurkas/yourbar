import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, FAB } from "react-native-paper";
import { StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// TopTabBar is rendered within each screen

import AllIngredientsScreen from "./AllIngredientsScreen";
import MyIngredientsScreen from "./MyIngredientsScreen";
import ShoppingIngredientsScreen from "./ShoppingIngredientsScreen";
import IngredientDetailsScreen from "./IngredientDetailsScreen";
import EditIngredientScreen from "./EditIngredientScreen";
import AddIngredientScreen from "./AddIngredientScreen";
import useTabsOnTop from "../../hooks/useTabsOnTop";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function IngredientTabs() {
  const theme = useTheme();
  const navigation = useNavigation();
  const tabsOnTop = useTabsOnTop();
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "All") iconName = "list";
            else if (route.name === "My") iconName = "check-circle";
            else if (route.name === "Shopping") iconName = "shopping-cart";
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: { backgroundColor: theme.colors.surface },
        })}
        tabBar={tabsOnTop ? () => null : undefined}
      >
        <Tab.Screen name="All" component={AllIngredientsScreen} />
        <Tab.Screen name="My" component={MyIngredientsScreen} />
        <Tab.Screen name="Shopping" component={ShoppingIngredientsScreen} />
      </Tab.Navigator>
      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primaryContainer,
            bottom: tabsOnTop ? 16 : 80,
          },
        ]}
        color={theme.colors.primary}
        onPress={() => navigation.navigate("AddIngredient")}
      />
    </>
  );
}

export default function IngredientsTabsScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="IngredientsMain"
        component={IngredientTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IngredientDetails"
        component={IngredientDetailsScreen}
        options={{ title: "Ingredient Details" }}
      />
      <Stack.Screen
        name="EditIngredient"
        component={EditIngredientScreen}
        options={{ title: "Edit Ingredient" }}
      />
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{ title: "Add Ingredient" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});

