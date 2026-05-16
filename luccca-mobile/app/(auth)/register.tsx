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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (
      !/(?=.*[a-z])/.test(formData.password) ||
      !/(?=.*[A-Z])/.test(formData.password) ||
      !/(?=.*\d)/.test(formData.password)
    ) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and numbers";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
      showToast("Account created successfully!", "success");
      router.replace("/(app)/calendar");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join LUCCCA to manage your team and calendar
          </Text>
        </View>

        <Card padding={24} shadow={false} bordered>
          {errors.form && (
            <View style={styles.formError}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}

          <TextInput
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(name) => setFormData({ ...formData, name })}
            editable={!loading}
            error={errors.name}
          />

          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            value={formData.email}
            onChangeText={(email) => setFormData({ ...formData, email })}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            error={errors.email}
          />

          <TextInput
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChangeText={(password) => setFormData({ ...formData, password })}
            secureTextEntry
            editable={!loading}
            error={errors.password}
            helper="At least 6 characters with uppercase, lowercase, and numbers"
          />

          <TextInput
            label="Confirm Password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChangeText={(confirmPassword) =>
              setFormData({ ...formData, confirmPassword })
            }
            secureTextEntry
            editable={!loading}
            error={errors.confirmPassword}
          />

          <Button
            label="Create Account"
            loading={loading}
            disabled={loading}
            onPress={handleRegister}
            style={styles.registerButton}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label="Sign Up with Google"
            variant="secondary"
            size="medium"
            disabled={loading}
            onPress={() => showToast("Google sign-up coming soon", "info")}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.helpText}>
          <Text style={styles.helpTextSmall}>
            By creating an account, you agree to our Terms of Service and
            Privacy Policy
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

  registerButton: {
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
