// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabMemoryProvider } from "./src/context/TabMemoryContext";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CocktailsScreen from "./src/screens/CocktailsScreen";
import ShakerScreen from "./src/screens/ShakerScreen";
import IngredientsTabsScreen from "./src/screens/IngredientsTabsScreen";

import GeneralMenuScreen from "./src/screens/GeneralMenuScreen";
import EditCustomTagsScreen from "./src/screens/EditCustomTagsScreen";
import { Provider as PaperProvider } from "react-native-paper";
import { AppTheme } from "./src/theme";
import { useEffect } from "react";

import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

import { importIngredients } from "./scripts/importIngredients";

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Cocktails") {
            return <MaterialIcons name="local-bar" size={size} color={color} />;
          } else if (route.name === "Shaker") {
            return <ShakerIcon width={size} height={size} fill={color} />;
          } else if (route.name === "Ingredients") {
            return <IngredientIcon width={size} height={size} fill={color} />;
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
  );
}

export default function App() {
  useEffect(() => {
    importIngredients(); // ⬅ Одноразово викличемо
  }, []);

  return (
    <PaperProvider theme={AppTheme}>
      <SafeAreaProvider>
        <TabMemoryProvider>
          <NavigationContainer>
            <RootStack.Navigator>
              <RootStack.Screen
                name="Tabs"
                component={Tabs}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="GeneralMenu"
                component={GeneralMenuScreen}
                options={{ title: "Menu" }}
              />
              <RootStack.Screen
                name="EditCustomTags"
                component={EditCustomTagsScreen}
                options={{ title: "Custom tags" }}
              />
            </RootStack.Navigator>
          </NavigationContainer>
        </TabMemoryProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
