import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";

interface CardProps extends ViewProps {
  padding?: number;
  bordered?: boolean;
  shadow?: boolean;
}

export function Card({
  padding = 16,
  bordered = false,
  shadow = true,
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding },
        bordered && styles.bordered,
        shadow && styles.shadow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
  },

  bordered: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  shadow: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
