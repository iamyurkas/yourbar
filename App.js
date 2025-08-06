import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";
import TagsScreen from "./src/screens/TagsScreen";
import AddTagScreen from "./src/screens/AddTagScreen";
import EditTagScreen from "./src/screens/EditTagScreen";
import AddIngredientScreen from "./src/screens/AddIngredientScreen";
import IngredientDetailsScreen from "./src/screens/IngredientDetailsScreen";
import EditIngredientScreen from "./src/screens/EditIngredientScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Tags"
          component={TagsScreen}
          options={{ title: "Ingredient Tags" }}
        />
        <Stack.Screen
          name="AddTag"
          component={AddTagScreen}
          options={{ title: "Add Tag" }}
        />
        <Stack.Screen
          name="EditTag"
          component={EditTagScreen}
          options={{ title: "Edit Tag" }}
        />
        <Stack.Screen
          name="AddIngredient"
          component={AddIngredientScreen}
          options={{ title: "New Ingredient" }}
        />
        <Stack.Screen
          name="IngredientDetails"
          component={IngredientDetailsScreen}
          options={{ title: "Ingredient" }}
        />
        <Stack.Screen
          name="EditIngredient"
          component={EditIngredientScreen}
          options={{ title: "Edit Ingredient" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
