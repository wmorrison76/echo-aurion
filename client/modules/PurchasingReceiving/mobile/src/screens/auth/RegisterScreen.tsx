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
export function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, loading, error } = useAuthStore();
  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    try {
      await register(email, password, name);
      Alert.alert("Success", "Account created successfully");
      navigation.navigate("Login");
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
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
          {" "}
          Create Account{" "}
        </Text>{" "}
        <Text className="text-center text-muted-foreground">
          Join Echo Ops Mobile
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
          {" "}
          Full Name{" "}
        </Text>{" "}
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base"
          placeholder="John Doe"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />{" "}
      </View>{" "}
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
      <View className="mb-4">
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
      <View className="mb-6">
        {" "}
        <Text className="text-sm font-semibold mb-2 text-foreground">
          {" "}
          Confirm Password{" "}
        </Text>{" "}
        <TextInput
          className="border border-border rounded-lg px-4 py-3 text-base"
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!loading}
          secureTextEntry
        />{" "}
      </View>{" "}
      <TouchableOpacity
        className="bg-red-500 rounded-lg py-4 mb-4"
        onPress={handleRegister}
        disabled={loading}
      >
        {" "}
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-center font-semibold text-base">
            {" "}
            Create Account{" "}
          </Text>
        )}{" "}
      </TouchableOpacity>{" "}
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        {" "}
        <Text className="text-center text-muted-foreground">
          {" "}
          Already have an account?{""}{" "}
          <Text className="font-semibold text-red-500">Sign in</Text>{" "}
        </Text>{" "}
      </TouchableOpacity>{" "}
    </ScrollView>
  );
}
