import React, { useEffect } from "react";
import { Animated, StyleSheet, Text, View, SafeAreaView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUIStore } from "@/store/ui-store";

export function Toast() {
  const { toasts, closeToast } = useUIStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => closeToast(toast.id)}
        />
      ))}
    </SafeAreaView>
  );
}

interface ToastItemProps {
  toast: ReturnType<typeof useUIStore>["toasts"][0];
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "check-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "alert";
      default:
        return "information";
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return "#dcfce7";
      case "error":
        return "#fee2e2";
      case "warning":
        return "#fef3c7";
      default:
        return "#dbeafe";
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case "success":
        return "#15803d";
      case "error":
        return "#991b1b";
      case "warning":
        return "#92400e";
      default:
        return "#1e40af";
    }
  };

  const getIconColor = () => {
    switch (toast.type) {
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      default:
        return "#3b82f6";
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[styles.toastContent, { backgroundColor: getBackgroundColor() }]}
      >
        <MaterialCommunityIcons
          name={getIcon()}
          size={20}
          color={getIconColor()}
        />
        <Text style={[styles.toastText, { color: getTextColor() }]}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },

  toast: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },

  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
