import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Text } from "react-native";

import Dashboard from "./screens/Dashboard";
import Cellar from "./screens/Cellar";
import Pairing from "./screens/Pairing";
import Training from "./screens/Training";
import Settings from "./screens/Settings";
import InventoryCount from "./screens/InventoryCount";
import TransferWorkflow from "./screens/TransferWorkflow";

import { initDB } from "./services/storage";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CellarHome" component={Cellar} />
      <Stack.Screen name="InventoryCount" component={InventoryCount} />
      <Stack.Screen name="TransferWorkflow" component={TransferWorkflow} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      await initDB();
      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setInitialized(true);
    }
  }

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          tabBarActiveTintColor: "#8B0000",
          tabBarInactiveTintColor: "#999",
          tabBarLabelStyle: { fontSize: 11, marginBottom: 6 },
          tabBarStyle: { paddingBottom: 6, height: 60 },
          headerStyle: { backgroundColor: "#fff" },
          headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen
          name="DashboardTab"
          component={Dashboard}
          options={{
            title: "Dashboard",
            headerTitle: "EchoServe Sommelier",
            tabBarLabel: "Dashboard",
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>📊</Text>,
          }}
        />

        <Tab.Screen
          name="InventoryTab"
          component={InventoryStack}
          options={{
            title: "Inventory",
            headerShown: false,
            tabBarLabel: "Inventory",
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>📦</Text>,
          }}
        />

        <Tab.Screen
          name="Pairing"
          component={Pairing}
          options={{
            title: "Pairings",
            headerTitle: "AI Wine Pairings",
            tabBarLabel: "Pairings",
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>🍷</Text>,
          }}
        />

        <Tab.Screen
          name="Training"
          component={Training}
          options={{
            title: "Training",
            headerTitle: "Master Sommelier Training",
            tabBarLabel: "Training",
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>📚</Text>,
          }}
        />

        <Tab.Screen
          name="Settings"
          component={Settings}
          options={{
            title: "Settings",
            headerTitle: "App Settings",
            tabBarLabel: "Settings",
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>⚙️</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
