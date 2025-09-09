// App.js
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TabMemoryProvider, useTabMemory } from "./src/context/TabMemoryContext";
import {
  IngredientUsageProvider,
  useIngredientUsage,
} from "./src/context/IngredientUsageContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider, useTheme } from "react-native-paper";
import { MenuProvider } from "react-native-popup-menu";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
import SplashScreen from "./src/screens/SplashScreen";

import CocktailIcon from "./assets/cocktail.svg";
import ShakerIcon from "./assets/shaker.svg";
import IngredientIcon from "./assets/lemon.svg";
import useIngredientsData from "./src/hooks/useIngredientsData";
import { getStartScreen } from "./src/data/settings";
import PlainHeader from "./src/components/PlainHeader";


const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const ShakerStack = createNativeStackNavigator();

function InitialDataLoader({ children }) {
  useIngredientsData();
  const { loading, importing } = useIngredientUsage();
  if (loading) {
    const message = importing
      ? 'Importing default data…\nThis may take a moment'
      : undefined;
    return <SplashScreen message={message} />;
  }
  return children;
}

function ShakerStackScreen() {
  return (
    <ShakerStack.Navigator
      screenOptions={{ header: (props) => <PlainHeader {...props} /> }}
    >
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

function Tabs({ startScreen }) {
  const theme = useTheme();
  const { getTab } = useTabMemory();
  const [startTab, startSub] = (startScreen || "cocktails:All").split(":");
  return (
    <Tab.Navigator
      initialRouteName={startTab === "ingredients" ? "Ingredients" : "Cocktails"}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Cocktails") {
            return <CocktailIcon width={size} height={size} fill={color} />;
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
      <Tab.Screen
        name="Cocktails"
        component={CocktailsTabsScreen}
        options={{ unmountOnBlur: true }}
        initialParams={{ screen: startTab === "cocktails" ? startSub : "All" }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const saved = typeof getTab === "function" && getTab("cocktails");
            navigation.navigate("Cocktails", {
              screen: "CocktailsMain",
              params: { screen: saved || "All" },
            });
          },
        })}
      />
      <Tab.Screen
        name="Shaker"
        component={ShakerStackScreen}
        options={{ unmountOnBlur: true }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Shaker", { screen: "ShakerMain" });
          },
        })}
      />
      <Tab.Screen
        name="Ingredients"
        component={IngredientsTabsScreen}
        options={{ unmountOnBlur: true }}
        initialParams={{ screen: startTab === "ingredients" ? startSub : "All" }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
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
  const [showSplash, setShowSplash] = useState(true);
  const [startScreen, setStartScreen] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    getStartScreen().then((v) => setStartScreen(v));
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !startScreen) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" hidden={false} />
          <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <SplashScreen />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={AppTheme}>
        <MenuProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" hidden={false} />
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
              <IngredientUsageProvider>
                <InitialDataLoader>
                  <TabMemoryProvider>
                    <NavigationContainer>
                      <RootStack.Navigator
                        screenOptions={{ header: (props) => <PlainHeader {...props} /> }}
                      >
                        <RootStack.Screen name="Tabs" options={{ headerShown: false }}>
                          {() => <Tabs startScreen={startScreen} />}
                        </RootStack.Screen>
                        <RootStack.Screen
                          name="EditCustomTags"
                          component={EditCustomTagsScreen}
                          options={{ title: "Custom tags" }}
                        />
                      </RootStack.Navigator>
                    </NavigationContainer>
                  </TabMemoryProvider>
                </InitialDataLoader>
              </IngredientUsageProvider>
            </SafeAreaView>
          </SafeAreaProvider>
        </MenuProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
