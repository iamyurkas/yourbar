import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CocktailsScreen from "./src/screens/CocktailsScreen";
import ShakerScreen from "./src/screens/ShakerScreen";
import IngredientsTabsScreen from "./src/screens/IngredientsTabsScreen";
import IngredientDetailsScreen from "./src/screens/IngredientDetailsScreen";
import EditIngredientScreen from "./src/screens/EditIngredientScreen";

import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Ingredients stack (with tabs + details/edit)
function IngredientsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="IngredientsTabs"
        component={IngredientsTabsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Ingredient Details"
        component={IngredientDetailsScreen}
        options={{ title: "Ingredient Details" }}
      />
      <Stack.Screen
        name="Edit Ingredient"
        component={EditIngredientScreen}
        options={{ title: "Edit Ingredient" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ color, size }) => {
              if (route.name === "Cocktails") {
                return (
                  <MaterialIcons name="local-bar" size={size} color={color} />
                );
              } else if (route.name === "Shaker") {
                return <ShakerIcon width={size} height={size} fill={color} />;
              } else if (route.name === "Ingredients") {
                return (
                  <IngredientIcon width={size} height={size} fill={color} />
                );
              }
            },
            tabBarActiveTintColor: "#4DABF7",
            tabBarInactiveTintColor: "#888",
          })}
        >
          <Tab.Screen name="Cocktails" component={CocktailsScreen} />
          <Tab.Screen name="Shaker" component={ShakerScreen} />
          <Tab.Screen name="Ingredients" component={IngredientsStack} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
