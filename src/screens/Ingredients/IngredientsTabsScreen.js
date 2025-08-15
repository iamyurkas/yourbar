import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, FAB } from "react-native-paper";
import { StyleSheet } from "react-native";

import TopTabBar, { TOP_TAB_BAR_HEIGHT } from "../../components/TopTabBar";

import AllIngredientsScreen from "./AllIngredientsScreen";
import MyIngredientsScreen from "./MyIngredientsScreen";
import ShoppingIngredientsScreen from "./ShoppingIngredientsScreen";
import IngredientDetailsScreen from "./IngredientDetailsScreen";
import EditIngredientScreen from "./EditIngredientScreen";
import AddIngredientScreen from "./AddIngredientScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function IngredientTabs() {
  const theme = useTheme();
  const navigation = useNavigation();
  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TopTabBar {...props} theme={theme} />}
        sceneContainerStyle={{ paddingTop: TOP_TAB_BAR_HEIGHT }}
      >
        <Tab.Screen name="All" component={AllIngredientsScreen} />
        <Tab.Screen name="My" component={MyIngredientsScreen} />
        <Tab.Screen name="Shopping" component={ShoppingIngredientsScreen} />
      </Tab.Navigator>
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate("AddIngredient")} />
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

