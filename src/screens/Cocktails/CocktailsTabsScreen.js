import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { FAB, useTheme } from "react-native-paper";
import { View } from "react-native";

import AllCocktailsScreen from "./AllCocktailsScreen";
import MyCocktailsScreen from "./MyCocktailsScreen";
import FavoriteCocktailsScreen from "./FavoriteCocktailsScreen";
import AddCocktailScreen from "./AddCocktailScreen";
import CocktailDetailsScreen from "./CocktailDetailsScreen";
import EditCocktailScreen from "./EditCocktailScreen";
import MenuButton from "../../components/MenuButton";

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function CocktailTabs() {
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
        <Tab.Screen name="All" component={AllCocktailsScreen} />
        <Tab.Screen name="My" component={MyCocktailsScreen} />
        <Tab.Screen name="Favorite" component={FavoriteCocktailsScreen} />
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
        onPress={() => navigation.navigate("AddCocktail")}
      />
    </View>
  );
}

export default function CocktailsTabsScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CocktailsMain"
        component={CocktailTabs}
        options={{
          headerTitle: "",
          headerLeft: () => <MenuButton />,
        }}
      />
      <Stack.Screen
        name="AddCocktail"
        component={AddCocktailScreen}
        options={{ title: "Add Cocktail" }}
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
    </Stack.Navigator>
  );
}
