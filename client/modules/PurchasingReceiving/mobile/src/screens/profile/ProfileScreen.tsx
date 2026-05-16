import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
export function ProfileScreen({ navigation }: any) {
  const { user, logout, switchOutlet } = useAuthStore();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };
  const handleSwitchOutlet = (outletId: string) => {
    switchOutlet(outletId);
    Alert.alert("Success", "Outlet switched successfully");
  };
  return (
    <ScrollView className="flex-1 bg-surface">
      {" "}
      <View className="bg-background px-4 py-6 border-b border-gray-200">
        {" "}
        <View className="flex-row items-center mb-4">
          {" "}
          <View className="w-16 h-16 bg-red-500 rounded-full justify-center items-center mr-4">
            {" "}
            <Text className="text-2xl font-bold text-white">
              {" "}
              {user?.name.charAt(0).toUpperCase()}{" "}
            </Text>{" "}
          </View>{" "}
          <View>
            {" "}
            <Text className="text-xl font-bold text-gray-900">
              {" "}
              {user?.name}{" "}
            </Text>{" "}
            <Text className="text-sm text-muted-foreground mt-1">
              {user?.email}
            </Text>{" "}
            <View className="mt-2 bg-red-100 px-3 py-1 rounded inline-block">
              {" "}
              <Text className="text-xs font-semibold text-red-700 capitalize">
                {" "}
                {user?.role}{" "}
              </Text>{" "}
            </View>{" "}
          </View>{" "}
        </View>{" "}
      </View>{" "}
      {user?.outlet_ids && user.outlet_ids.length > 1 && (
        <View className="mt-4 px-4">
          {" "}
          <Text className="text-lg font-bold text-gray-900 mb-3">
            {" "}
            Your Outlets{" "}
          </Text>{" "}
          {user.outlet_ids.map((outletId) => (
            <TouchableOpacity
              key={outletId}
              className={`p-4 rounded-lg border mb-2 flex-row items-center justify-between ${user.current_outlet_id === outletId ? "bg-red-50 border-red-500" : "bg-background border-gray-200"}`}
              onPress={() => handleSwitchOutlet(outletId)}
            >
              {" "}
              <View className="flex-row items-center flex-1">
                {" "}
                <Feather
                  name="map-pin"
                  size={20}
                  color={
                    user.current_outlet_id === outletId ? "#ef4444" : "#6b7280"
                  }
                  style={{ marginRight: 12 }}
                />{" "}
                <View>
                  {" "}
                  <Text
                    className={`font-semibold ${user.current_outlet_id === outletId ? "text-red-500" : "text-gray-900"}`}
                  >
                    {" "}
                    Outlet {outletId.slice(0, 8)}{" "}
                  </Text>{" "}
                  <Text className="text-xs text-muted-foreground mt-1">
                    {outletId}
                  </Text>{" "}
                </View>{" "}
              </View>{" "}
              {user.current_outlet_id === outletId && (
                <View className="bg-red-500 px-3 py-1 rounded">
                  {" "}
                  <Text className="text-xs font-semibold text-white">
                    {" "}
                    Active{" "}
                  </Text>{" "}
                </View>
              )}{" "}
            </TouchableOpacity>
          ))}{" "}
        </View>
      )}{" "}
      <View className="mt-6 px-4">
        {" "}
        <Text className="text-lg font-bold text-gray-900 mb-3">
          Settings
        </Text>{" "}
        <View className="bg-background rounded-lg border border-gray-200 overflow-hidden">
          {" "}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            {" "}
            <View className="flex-row items-center flex-1">
              {" "}
              <Feather
                name="bell"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />{" "}
              <Text className="text-gray-900 font-semibold">
                {" "}
                Push Notifications{" "}
              </Text>{" "}
            </View>{" "}
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#d1d5db", true: "#fca5a5" }}
              thumbColor={notifications ? "#ef4444" : "#ffffff"}
            />{" "}
          </View>{" "}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            {" "}
            <View className="flex-row items-center flex-1">
              {" "}
              <Feather
                name="moon"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />{" "}
              <Text className="text-gray-900 font-semibold">
                Dark Mode
              </Text>{" "}
            </View>{" "}
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#d1d5db", true: "#fca5a5" }}
              thumbColor={darkMode ? "#ef4444" : "#ffffff"}
            />{" "}
          </View>{" "}
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-200">
            {" "}
            <Feather
              name="lock"
              size={20}
              color="#6b7280"
              style={{ marginRight: 12 }}
            />{" "}
            <Text className="flex-1 text-gray-900 font-semibold">
              {" "}
              Change Password{" "}
            </Text>{" "}
            <Feather name="chevron-right" size={20} color="#d1d5db" />{" "}
          </TouchableOpacity>{" "}
          <TouchableOpacity className="flex-row items-center p-4">
            {" "}
            <Feather
              name="help-circle"
              size={20}
              color="#6b7280"
              style={{ marginRight: 12 }}
            />{" "}
            <Text className="flex-1 text-gray-900 font-semibold">
              {" "}
              Help & Support{" "}
            </Text>{" "}
            <Feather name="chevron-right" size={20} color="#d1d5db" />{" "}
          </TouchableOpacity>{" "}
        </View>{" "}
      </View>{" "}
      <View className="mt-6 px-4 mb-6">
        {" "}
        <TouchableOpacity
          className="bg-red-500 rounded-lg py-4"
          onPress={handleLogout}
        >
          {" "}
          <Text className="text-white text-center font-semibold text-base">
            {" "}
            Logout{" "}
          </Text>{" "}
        </TouchableOpacity>{" "}
      </View>{" "}
      <View className="px-4 pb-6 border-t border-gray-200 pt-6">
        {" "}
        <Text className="text-xs text-muted-foreground text-center">
          {" "}
          Echo Ops Mobile v1.0.0{" "}
        </Text>{" "}
      </View>{" "}
    </ScrollView>
  );
}
