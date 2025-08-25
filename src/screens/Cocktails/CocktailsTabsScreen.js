import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, FAB } from "react-native-paper";
import { StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { HEADER_HEIGHT } from "../../constants/layout";

// TopTabBar is rendered within each screen

import AllCocktailsScreen from "./AllCocktailsScreen";
import MyCocktailsScreen from "./MyCocktailsScreen";
import FavoriteCocktailsScreen from "./FavoriteCocktailsScreen";
import CocktailDetailsScreen from "./CocktailDetailsScreen";
import EditCocktailScreen from "./EditCocktailScreen";
import AddCocktailScreen from "./AddCocktailScreen";
import IngredientDetailsScreen from "../Ingredients/IngredientDetailsScreen";
import EditIngredientScreen from "../Ingredients/EditIngredientScreen";
import useTabsOnTop from "../../hooks/useTabsOnTop";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CocktailTabs({ route }) {
  const theme = useTheme();
  const navigation = useNavigation();
  const tabsOnTop = useTabsOnTop();
  const initial = route?.params?.screen || "All";
  return (
    <>
      <Tab.Navigator
        initialRouteName={initial}
        screenOptions={({ route }) => {
          const options = {
            headerShown: false,
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === "All") iconName = "list";
              else if (route.name === "My") iconName = "check-circle";
              else if (route.name === "Favorite") iconName = "star";
              return <MaterialIcons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          };
          if (!tabsOnTop) {
            options.tabBarStyle = {
              backgroundColor: theme.colors.background,
              borderTopWidth: 0,
              borderTopColor: theme.colors.background,
            };
          }
          return options;
        }}
        tabBar={tabsOnTop ? () => null : undefined}
      >
        <Tab.Screen name="All" component={AllCocktailsScreen} />
        <Tab.Screen name="My" component={MyCocktailsScreen} />
        <Tab.Screen name="Favorite" component={FavoriteCocktailsScreen} />
      </Tab.Navigator>
      <FAB
        icon="plus"
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primaryContainer,
            bottom: tabsOnTop ? 16 : 80,
          },
        ]}
        color={theme.colors.primary}
        onPress={() => navigation.navigate("AddCocktail")}
      />
    </>
  );
}

export default function CocktailsTabsScreen({ route }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerStyle: { height: HEADER_HEIGHT } }}
    >
      <Stack.Screen
        name="CocktailsMain"
        component={CocktailTabs}
        options={{ headerShown: false }}
        initialParams={{ screen: route?.params?.screen }}
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

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});

