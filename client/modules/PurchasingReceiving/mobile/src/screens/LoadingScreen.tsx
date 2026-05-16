import React from "react";
import { View, ActivityIndicator } from "react-native";
export function LoadingScreen() {
  return (
    <View className="flex-1 bg-background justify-center items-center">
      {" "}
      <ActivityIndicator size="large" color="#ef4444" />{" "}
    </View>
  );
}
