import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useAuthStore } from "@stores/authStore";
export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuthStore();
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-center px-4"
    >
      {" "}
      <View className="mb-8">
        {" "}
        <Text className="text-3xl font-bold text-center mb-2">
          Echo Ops
        </Text>{" "}
        <Text className="text-center text-muted-foreground">
          {" "}
          Mobile Receiving & Inventory{" "}
        </Text>{" "}
      </View>{" "}
      {error && (
        <View className="bg-red-100 p-3 rounded-lg mb-4">
          {" "}
          <Text className="text-red-800 text-sm">{error}</Text>{" "}
        </View>
      )}{" "}
      <View className="mb-4">
        {" "}
        <Text className="text-sm font-semibold mb-2 text-foreground">
          Email
        </Text>{" "}
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base"
          placeholder="your@email.com"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />{" "}
      </View>{" "}
      <View className="mb-6">
        {" "}
        <Text className="text-sm font-semibold mb-2 text-foreground">
          {" "}
          Password{" "}
        </Text>{" "}
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          secureTextEntry
        />{" "}
      </View>{" "}
      <TouchableOpacity
        className="bg-red-500 rounded-lg py-4 mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {" "}
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-center font-semibold text-base">
            {" "}
            Sign In{" "}
          </Text>
        )}{" "}
      </TouchableOpacity>{" "}
      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        {" "}
        <Text className="text-center text-muted-foreground">
          {" "}
          Don't have an account?{""}{" "}
          <Text className="font-semibold text-red-500">Sign up</Text>{" "}
        </Text>{" "}
      </TouchableOpacity>{" "}
    </ScrollView>
  );
}
