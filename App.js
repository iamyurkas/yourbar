import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { TabMemoryProvider } from "./src/context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CocktailsScreen from "./src/screens/CocktailsScreen";
import ShakerScreen from "./src/screens/ShakerScreen";
import IngredientsTabsScreen from "./src/screens/IngredientsTabsScreen";

import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <TabMemoryProvider>
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
            <Tab.Screen name="Ingredients" component={IngredientsTabsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </TabMemoryProvider>
    </SafeAreaProvider>
  );
}
