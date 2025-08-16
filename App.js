// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabMemoryProvider, useTabMemory } from "./src/context/TabMemoryContext";
import { IngredientUsageProvider } from "./src/context/IngredientUsageContext";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider, useTheme } from "react-native-paper";
import { MenuProvider } from "react-native-popup-menu";

import CocktailsTabsScreen from "./src/screens/Cocktails/CocktailsTabsScreen";
import ShakerScreen from "./src/screens/ShakerScreen";
import IngredientDetailsScreen from "./src/screens/Ingredients/IngredientDetailsScreen";
import EditIngredientScreen from "./src/screens/Ingredients/EditIngredientScreen";
import CocktailDetailsScreen from "./src/screens/Cocktails/CocktailDetailsScreen";
import EditCocktailScreen from "./src/screens/Cocktails/EditCocktailScreen";
import IngredientsTabsScreen from "./src/screens/Ingredients/IngredientsTabsScreen";

import EditCustomTagsScreen from "./src/screens/IngredientsTags/EditCustomTagsScreen";
import { AppTheme } from "./src/theme";
import ShakerResultsScreen from "./src/screens/ShakerResultsScreen";

import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";

import { importCocktailsAndIngredients } from "./scripts/importCocktailsAndIngredients";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const ShakerStack = createNativeStackNavigator();

function ShakerStackScreen() {
  return (
    <ShakerStack.Navigator>
      <ShakerStack.Screen
        name="ShakerMain"
        component={ShakerScreen}
        options={{ headerShown: false }}
      />
      <ShakerStack.Screen
        name="IngredientDetails"
        component={IngredientDetailsScreen}
        options={{ title: "Ingredient Details" }}
      />
      <ShakerStack.Screen
        name="EditIngredient"
        component={EditIngredientScreen}
        options={{ title: "Edit Ingredient" }}
      />
      <ShakerStack.Screen
        name="CocktailDetails"
        component={CocktailDetailsScreen}
        options={{ title: "Cocktail Details" }}
      />
      <ShakerStack.Screen
        name="EditCocktail"
        component={EditCocktailScreen}
        options={{ title: "Edit Cocktail" }}
      />
      <ShakerStack.Screen
        name="ShakerResults"
        component={ShakerResultsScreen}
        options={{ headerShown: false }}
      />
    </ShakerStack.Navigator>
  );
}

function Tabs() {
  const theme = useTheme();
  const { getTab } = useTabMemory();
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
      })}
    >
      {/* ⬇️ Тут напряму твій екран з внутрішніми табами коктейлів */}
      <Tab.Screen name="Cocktails" component={CocktailsTabsScreen} />
      <Tab.Screen name="Shaker" component={ShakerStackScreen} />
      <Tab.Screen
        name="Ingredients"
        component={IngredientsTabsScreen}
        listeners={({ navigation }) => ({
          tabPress: () => {
            const saved =
              typeof getTab === "function" && getTab("ingredients");
            navigation.navigate("Ingredients", {
              screen: "IngredientsMain",
              params: { screen: saved || "All" },
            });
          },
        })}
      />
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
