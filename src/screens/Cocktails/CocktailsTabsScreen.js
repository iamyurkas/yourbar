import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

import { useTabMemory } from "../../context/TabMemoryContext";

import AllCocktailsScreen from "./AllCocktailsScreen";
import CocktailDetailsScreen from "./CocktailDetailsScreen";
import EditCocktailScreen from "./EditCocktailScreen";
import MyCocktailsScreen from "./MyCocktailsScreen";
import FavoriteCocktailsScreen from "./FavoriteCocktailsScreen";
import AddCocktailScreen from "./AddCocktailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Create tab
function CreateCocktailStack() {
  return (
    <Stack.Navigator initialRouteName="AddCocktail">
      <Stack.Screen
        name="AddCocktail"
        component={AddCocktailScreen}
        options={{ title: "Add Cocktail" }}
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

export default function CocktailsTabsScreen() {
  const theme = useTheme();
  const tabRef = React.useRef(null);
  const { getTab } = useTabMemory();

  const [createKey, setCreateKey] = React.useState(0);

  const initialTab =
    (typeof getTab === "function" && getTab("cocktails")) || "All";

  useFocusEffect(
    React.useCallback(() => {
      const state = tabRef.current?.getState();
      const active = state?.routes?.[state?.index ?? 0]?.name;
      if (active === "Create") {
        const last =
          (typeof getTab === "function" && getTab("cocktails")) || "All";
        tabRef.current?.navigate(last);
      }
      return () => {
        setCreateKey((k) => k + 1);
      };
    }, [getTab])
  );

  return (
    <Tab.Navigator
      ref={tabRef}
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "All") iconName = "list";
          else if (route.name === "My") iconName = "check-circle";
          else if (route.name === "Favorite") iconName = "star";
          else if (route.name === "Create") iconName = "add-circle-outline";
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      })}
    >
      <Tab.Screen name="All" component={AllCocktailsScreen} />
      <Tab.Screen name="My" component={MyCocktailsScreen} />
      <Tab.Screen name="Favorite" component={FavoriteCocktailsScreen} />
      <Tab.Screen
        name="Create"
        // Через render-prop ми можемо підставити key для примусового ремоунта
        children={() => <CreateCocktailStack key={createKey} />}
        listeners={({ navigation }) => ({
          // При перемиканні з Create на інші саб-таби (All/My/Favorite)
          blur: () => setCreateKey((k) => k + 1),
          // І залишаємо авто-перехід на корінь створення по тапу на таб
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Create", { screen: "AddCocktail" });
          },
        })}
      />
    </Tab.Navigator>
  );
}
