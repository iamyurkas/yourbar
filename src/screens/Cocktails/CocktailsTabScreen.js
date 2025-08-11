import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import AllCocktailsScreen from "./AllCocktailsScreen";
import CocktailDetailsScreen from "./CocktailDetailsScreen";
import EditCocktailScreen from "./EditCocktailScreen";
import MyCocktailsScreen from "./MyCocktailsScreen";
import FavoriteCocktailsScreen from "./FavoriteCocktailsScreen";
import AddCocktailScreen from "./AddCocktailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Create tab
function CreateCocktailStack() {
  return (
    <Stack.Navigator initialRouteName="AddCocktail">
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

export default function CocktailsTabsScreen() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "All") iconName = "list";
          else if (route.name === "My") iconName = "check-circle";
          else if (route.name === "Favorite") iconName = "star";
          else if (route.name === "Create") iconName = "add-circle-outline";
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      })}
    >
      <Tab.Screen name="All" component={AllCocktailsScreen} />
      <Tab.Screen name="My" component={MyCocktailsScreen} />
      <Tab.Screen name="Favorite" component={FavoriteCocktailsScreen} />
      <Tab.Screen
        name="Create"
        component={CreateCocktailStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Create", {
              screen: "AddCocktail",
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}
