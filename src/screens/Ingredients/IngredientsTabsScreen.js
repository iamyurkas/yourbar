import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { FAB, useTheme } from "react-native-paper";
import { View } from "react-native";

import AllIngredientsScreen from "./AllIngredientsScreen";
import MyIngredientsScreen from "./MyIngredientsScreen";
import ShoppingIngredientsScreen from "./ShoppingIngredientsScreen";
import AddIngredientScreen from "./AddIngredientScreen";
import IngredientDetailsScreen from "./IngredientDetailsScreen";
import EditIngredientScreen from "./EditIngredientScreen";
import MenuButton from "../../components/MenuButton";

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function IngredientTabs() {
  const theme = useTheme();
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
        }}
      >
        <Tab.Screen name="All" component={AllIngredientsScreen} />
        <Tab.Screen name="My" component={MyIngredientsScreen} />
        <Tab.Screen name="Shopping" component={ShoppingIngredientsScreen} />
      </Tab.Navigator>
      <FAB
        icon="plus"
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          backgroundColor: theme.colors.primaryContainer,
        }}
        color={theme.colors.onPrimaryContainer}
        onPress={() => navigation.navigate("AddIngredient")}
      />
    </View>
  );
}

export default function IngredientsTabsScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="IngredientsMain"
        component={IngredientTabs}
        options={{ headerTitle: "", headerLeft: () => <MenuButton /> }}
      />
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{ title: "Add Ingredient" }}
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
    </Stack.Navigator>
  );
}
