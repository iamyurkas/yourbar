import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";

import AllIngredientsScreen from "./AllIngredientsScreen";

import MyIngredientsScreen from "./MyIngredientsScreen";

import ShoppingIngredientsScreen from "./ShoppingIngredientsScreen";

import IngredientDetailsScreen from "./IngredientDetailsScreen";
import EditIngredientScreen from "./EditIngredientScreen";
import AddIngredientScreen from "./AddIngredientScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Стек для вкладки Create
function CreateIngredientStack() {
  return (
    <Stack.Navigator initialRouteName="AddIngredient">
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{ title: "Add Ingredient" }}
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

export default function IngredientsTabsScreen() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "All") iconName = "list";
          else if (route.name === "My") iconName = "check-circle";
          else if (route.name === "Shopping") iconName = "shopping-cart";
          else if (route.name === "Create") iconName = "add-circle-outline";
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4DABF7",
        tabBarInactiveTintColor: "#888",
      })}
    >
      <Tab.Screen name="All" component={AllIngredientsScreen} />
      <Tab.Screen name="My" component={MyIngredientsScreen} />
      <Tab.Screen name="Shopping" component={ShoppingIngredientsScreen} />
      <Tab.Screen
        name="Create"
        component={CreateIngredientStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Запобігає стандартній поведінці
            e.preventDefault();

            // Скидає стек до початкового екрану AddIngredient
            navigation.navigate("Create", {
              screen: "AddIngredient",
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}
