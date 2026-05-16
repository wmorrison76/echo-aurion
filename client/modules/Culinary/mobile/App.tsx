import React, { useEffect, useState } from "react";
const { useEffect, useState } = React;

import { SafeAreaView, StatusBar } from"react-native";
import * as Font from"expo-font";
import * as SplashScreen from"expo-splash-screen";
import { NavigationContainer } from"@react-navigation/native";
import { createNativeStackNavigator } from"@react-navigation/native-stack";
import { createBottomTabNavigator } from"@react-navigation/bottom-tabs";
import { Provider as PaperProvider } from"react-native-paper";
import Ionicons from"@expo/vector-icons/Ionicons";
import { AuthProvider, useAuth } from"../client/context/AuthContext";
import { AppDataProvider } from"../client/context/AppDataContext";
import LoginScreen from"./screens/auth/LoginScreen";
import SignUpScreen from"./screens/auth/SignUpScreen";
import RecipesScreen from"./screens/tabs/RecipesScreen";
import SuppliersScreen from"./screens/tabs/SuppliersScreen";
import OrdersScreen from"./screens/tabs/OrdersScreen";
import CostingScreen from"./screens/tabs/CostingScreen";
import ProfileScreen from"./screens/tabs/ProfileScreen";
import RecipeDetailScreen from"./screens/recipes/RecipeDetailScreen";
import SyncStatus from"./components/SyncStatus"; // Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync(); const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator(); function AuthStack() { return ( <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true, }} > <Stack.Screen name="Login" component={LoginScreen} /> <Stack.Screen name="SignUp" component={SignUpScreen} /> </Stack.Navigator> );
} function TabNavigator() { return ( <Tab.Navigator screenOptions={{ headerShown: true, tabBarActiveTintColor:"#0ea5e9", tabBarInactiveTintColor:"#94a3b8", }} > <Tab.Screen name="Recipes" component={RecipesScreen} options={{ tabBarLabel:"Recipes", tabBarIcon: ({ color, size }) => ( <Ionicons name="book-outline" size={size} color={color} /> ), headerTitle:"Recipe Search", }} /> <Tab.Screen name="Suppliers" component={SuppliersScreen} options={{ tabBarLabel:"Suppliers", tabBarIcon: ({ color, size }) => ( <Ionicons name="car-outline" size={size} color={color} /> ), headerTitle:"Suppliers", }} /> <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarLabel:"Orders", tabBarIcon: ({ color, size }) => ( <Ionicons name="cart-outline" size={size} color={color} /> ), headerTitle:"Purchase Orders", }} /> <Tab.Screen name="Costing" component={CostingScreen} options={{ tabBarLabel:"Costing", tabBarIcon: ({ color, size }) => ( <Ionicons name="cash-outline" size={size} color={color} /> ), headerTitle:"Plate Costing", }} /> <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel:"Profile", tabBarIcon: ({ color, size }) => ( <Ionicons name="person-outline" size={size} color={color} /> ), headerTitle:"My Profile", }} /> </Tab.Navigator> );
} function AppNavigator() { const { isAuthenticated, loading } = useAuth(); if (loading) { return null; } return ( <NavigationContainer> {isAuthenticated ? ( <Stack.Navigator screenOptions={{ headerShown: false, }} > <Stack.Screen name="Main" component={TabNavigator} /> <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ headerShown: true, headerTitle:"Recipe Details", animationEnabled: true, }} /> </Stack.Navigator> ) : ( <AuthStack /> )} </NavigationContainer> );
} function AppContent() { const [fontsLoaded, setFontsLoaded] = useState(false); useEffect(() => { async function prepare() { try { // Load fonts await Font.loadAsync({"Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),"Inter-Bold": require("./assets/fonts/Inter-Bold.ttf"),"Inter-SemiBold": require("./assets/fonts/Inter-SemiBold.ttf"), }); setFontsLoaded(true); } catch (e) { console.warn(e); } finally { await SplashScreen.hideAsync(); } } prepare(); }, []); if (!fontsLoaded) { return null; } return ( <SafeAreaView style={{ flex: 1, backgroundColor:"#fff" }}> <StatusBar barStyle="dark-content" backgroundColor="#fff" /> <AppNavigator /> <SyncStatus /> </SafeAreaView> );
} export default function App() { return ( <PaperProvider> <AuthProvider> <AppDataProvider> <AppContent /> </AppDataProvider> </AuthProvider> </PaperProvider> );
}
