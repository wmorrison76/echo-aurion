import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuthStore } from "@stores/authStore";
import { Feather } from "@expo/vector-icons";
import { LoginScreen } from "@screens/auth/LoginScreen";
import { RegisterScreen } from "@screens/auth/RegisterScreen";
import { DashboardScreen } from "@screens/dashboard/DashboardScreen";
import { ReceivingScreen } from "@screens/receiving/ReceivingScreen";
import { InventoryScreen } from "@screens/inventory/InventoryScreen";
import { OrdersScreen } from "@screens/orders/OrdersScreen";
import { ProfileScreen } from "@screens/profile/ProfileScreen";
import { OutletDetailsScreen } from "@screens/outlets/OutletDetailsScreen";
import { InvoiceDetailsScreen } from "@screens/invoices/InvoiceDetailsScreen";
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animationEnabled: true }}
    >
      {" "}
      <Stack.Screen name="Login" component={LoginScreen} />{" "}
      <Stack.Screen name="Register" component={RegisterScreen} />{" "}
    </Stack.Navigator>
  );
}
function DashboardNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: "#ef4444",
      }}
    >
      {" "}
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />{" "}
      <Stack.Screen
        name="OutletDetails"
        component={OutletDetailsScreen}
        options={{ title: "Outlet Details" }}
      />{" "}
    </Stack.Navigator>
  );
}
function ReceivingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: "#ef4444",
      }}
    >
      {" "}
      <Stack.Screen
        name="ReceivingHome"
        component={ReceivingScreen}
        options={{ headerShown: false }}
      />{" "}
      <Stack.Screen
        name="InvoiceDetails"
        component={InvoiceDetailsScreen}
        options={{ title: "Invoice Details" }}
      />{" "}
    </Stack.Navigator>
  );
}
function InventoryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: "#ef4444",
      }}
    >
      {" "}
      <Stack.Screen
        name="InventoryHome"
        component={InventoryScreen}
        options={{ headerShown: false }}
      />{" "}
    </Stack.Navigator>
  );
}
function OrdersNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: "#ef4444",
      }}
    >
      {" "}
      <Stack.Screen
        name="OrdersHome"
        component={OrdersScreen}
        options={{ headerShown: false }}
      />{" "}
    </Stack.Navigator>
  );
}
function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#ef4444",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#f3f4f6" },
        tabBarIcon: ({ color, size }) => {
          let iconName: string;
          if (route.name === "Dashboard") {
            iconName = "home";
          } else if (route.name === "Receiving") {
            iconName = "inbox";
          } else if (route.name === "Inventory") {
            iconName = "package";
          } else if (route.name === "Orders") {
            iconName = "shopping-cart";
          } else {
            iconName = "user";
          }
          return <Feather name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      {" "}
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{ title: "Dashboard" }}
      />{" "}
      <Tab.Screen
        name="Receiving"
        component={ReceivingNavigator}
        options={{ title: "Receiving" }}
      />{" "}
      <Tab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{ title: "Inventory" }}
      />{" "}
      <Tab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{ title: "Orders" }}
      />{" "}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />{" "}
    </Tab.Navigator>
  );
}
export function RootNavigator() {
  const { user } = useAuthStore();
  return user ? <AppNavigator /> : <AuthNavigator />;
}
