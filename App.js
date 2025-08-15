// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabMemoryProvider } from "./src/context/TabMemoryContext";
import { IngredientUsageProvider } from "./src/context/IngredientUsageContext";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider, useTheme } from "react-native-paper";
import { MenuProvider } from "react-native-popup-menu";

import CocktailsTabsScreen from "./src/screens/Cocktails/CocktailsTabsScreen";
import ShakerScreen from "./src/screens/ShakerScreen";
import IngredientsTabsScreen from "./src/screens/Ingredients/IngredientsTabsScreen";

import EditCustomTagsScreen from "./src/screens/IngredientsTags/EditCustomTagsScreen";
import { AppTheme } from "./src/theme";

import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";

import { importCocktailsAndIngredients } from "./scripts/importCocktailsAndIngredients";
import useTabsOnTop from "./src/hooks/useTabsOnTop";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function Tabs() {
  const theme = useTheme();
  const tabsOnTop = useTabsOnTop();
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
          return null;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          borderTopColor: theme.colors.surface,
        },
        ...(tabsOnTop
          ? {}
          : { tabBarActiveBackgroundColor: theme.colors.background }),
      })}
    >
      {/* ⬇️ Тут напряму твій екран з внутрішніми табами коктейлів */}
      <Tab.Screen name="Cocktails" component={CocktailsTabsScreen} />
      <Tab.Screen name="Shaker" component={ShakerScreen} />
      <Tab.Screen name="Ingredients" component={IngredientsTabsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    importCocktailsAndIngredients();
  }, []);

  return (
    <PaperProvider theme={AppTheme}>
      <MenuProvider>
        <SafeAreaProvider>
          <IngredientUsageProvider>
            <TabMemoryProvider>
              <NavigationContainer>
                <RootStack.Navigator>
                  <RootStack.Screen
                    name="Tabs"
                    component={Tabs}
                    options={{ headerShown: false }}
                  />
                  <RootStack.Screen
                    name="EditCustomTags"
                    component={EditCustomTagsScreen}
                    options={{ title: "Custom tags" }}
                  />
                </RootStack.Navigator>
              </NavigationContainer>
            </TabMemoryProvider>
          </IngredientUsageProvider>
        </SafeAreaProvider>
      </MenuProvider>
    </PaperProvider>
  );
}
