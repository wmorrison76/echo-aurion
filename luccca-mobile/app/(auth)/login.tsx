import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      showToast("Login successful!", "success");
      router.replace("/(app)/calendar");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      showToast(message, "error");
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to LUCCCA</Text>
          <Text style={styles.subtitle}>
            Manage your team and calendar efficiently
          </Text>
        </View>

        <Card padding={24} shadow={false} bordered>
          {errors.form && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}

          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            error={errors.email}
          />

          <TextInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            error={errors.password}
          />

          <Button
            label="Sign In"
            loading={loading}
            disabled={loading}
            onPress={handleLogin}
            style={styles.loginButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label="Sign In with Google"
            variant="secondary"
            size="medium"
            disabled={loading}
            onPress={() => showToast("Google sign-in coming soon", "info")}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.helpText}>
          <Text style={styles.helpTextSmall}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  header: {
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },

  formError: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },

  formErrorText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
  },

  loginButton: {
    marginTop: 8,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  dividerText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  footerText: {
    fontSize: 14,
    color: "#6b7280",
  },

  footerLink: {
    fontSize: 14,
    color: "#1e3a8a",
    fontWeight: "600",
  },

  helpText: {
    marginTop: "auto",
    paddingVertical: 16,
  },

  helpTextSmall: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
});
