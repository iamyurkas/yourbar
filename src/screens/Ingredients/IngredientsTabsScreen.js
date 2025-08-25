import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useTheme, FAB } from "react-native-paper";
import { StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PlainHeader from "../../components/PlainHeader";

// TopTabBar is rendered within each screen

import AllIngredientsScreen from "./AllIngredientsScreen";
import MyIngredientsScreen from "./MyIngredientsScreen";
import ShoppingIngredientsScreen from "./ShoppingIngredientsScreen";
import IngredientDetailsScreen from "./IngredientDetailsScreen";
import EditIngredientScreen from "./EditIngredientScreen";
import AddIngredientScreen from "./AddIngredientScreen";
import CocktailDetailsScreen from "../Cocktails/CocktailDetailsScreen";
import EditCocktailScreen from "../Cocktails/EditCocktailScreen";
import useTabsOnTop from "../../hooks/useTabsOnTop";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function IngredientTabs({ route }) {
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
              else if (route.name === "Shopping") iconName = "shopping-cart";
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
        <Tab.Screen name="All" component={AllIngredientsScreen} />
        <Tab.Screen name="My" component={MyIngredientsScreen} />
        <Tab.Screen name="Shopping" component={ShoppingIngredientsScreen} />
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
        onPress={() => navigation.navigate("AddIngredient")}
      />
    </>
  );
}

export default function IngredientsTabsScreen({ route }) {
  return (
    <Stack.Navigator
      screenOptions={{ header: (props) => <PlainHeader {...props} /> }}
    >
      <Stack.Screen
        name="IngredientsMain"
        component={IngredientTabs}
        options={{ headerShown: false }}
        initialParams={{ screen: route?.params?.screen }}
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
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{ title: "Add Ingredient" }}
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

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});

