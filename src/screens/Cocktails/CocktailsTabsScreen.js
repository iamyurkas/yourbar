import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, FAB } from "react-native-paper";
import { StyleSheet } from "react-native";

// TopTabBar is rendered within each screen

import AllCocktailsScreen from "./AllCocktailsScreen";
import MyCocktailsScreen from "./MyCocktailsScreen";
import FavoriteCocktailsScreen from "./FavoriteCocktailsScreen";
import CocktailDetailsScreen from "./CocktailDetailsScreen";
import EditCocktailScreen from "./EditCocktailScreen";
import AddCocktailScreen from "./AddCocktailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CocktailTabs() {
  const theme = useTheme();
  const navigation = useNavigation();
  return (
    <>
      <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={() => null}>
        <Tab.Screen name="All" component={AllCocktailsScreen} />
        <Tab.Screen name="My" component={MyCocktailsScreen} />
        <Tab.Screen name="Favorite" component={FavoriteCocktailsScreen} />
      </Tab.Navigator>
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.primary}
        onPress={() => navigation.navigate("AddCocktail")}
      />
    </>
  );
}

export default function CocktailsTabsScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CocktailsMain"
        component={CocktailTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CocktailDetails"
        component={CocktailDetailsScreen}
        options={{ title: "Cocktail Details" }}
      />
      <Stack.Screen
        name="EditCocktail"
        component={EditCocktailScreen}
        options={{ title: "Edit Cocktail" }}
      />
      <Stack.Screen
        name="AddCocktail"
        component={AddCocktailScreen}
        options={{ title: "Add Cocktail" }}
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

