import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export function Button({
  label,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        isDisabled && styles.buttonDisabled,
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#ffffff" : "#1e3a8a"}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`text_${size}`],
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  button_primary: {
    backgroundColor: "#1e3a8a",
  },

  button_secondary: {
    backgroundColor: "#e5e7eb",
  },

  button_danger: {
    backgroundColor: "#ef4444",
  },

  button_ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1e3a8a",
  },

  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
  },

  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
  },

  button_large: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    height: 48,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  text: {
    fontWeight: "600",
  },

  text_primary: {
    color: "#ffffff",
  },

  text_secondary: {
    color: "#1f2937",
  },

  text_danger: {
    color: "#ffffff",
  },

  text_ghost: {
    color: "#1e3a8a",
  },

  text_small: {
    fontSize: 12,
  },

  text_medium: {
    fontSize: 14,
  },

  text_large: {
    fontSize: 16,
  },
});
