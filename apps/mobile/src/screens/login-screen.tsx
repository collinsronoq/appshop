import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";

import { AuthApiError } from "../auth/api-client";
import { useAuth } from "../auth/auth-context";
import { validateLogin } from "../auth/validation";
import { AuthScreen, authStyles } from "../components/auth-screen";

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const input = { email: email.trim().toLowerCase(), password };
    const validationError = validateLogin(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(input);
    } catch (caught) {
      setError(
        caught instanceof AuthApiError ? caught.message : "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to keep your household shopping in sync."
      footer={
        <Text style={authStyles.footerText}>
          New here?{" "}
          <Text
            accessibilityRole="link"
            onPress={() => router.push("/register")}
            style={authStyles.footerLink}
          >
            Create an account
          </Text>
        </Text>
      }
    >
      <Text style={authStyles.label}>Email</Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSubmitting}
        keyboardType="email-address"
        onChangeText={setEmail}
        returnKeyType="next"
        style={authStyles.input}
        value={email}
      />
      <Text style={authStyles.label}>Password</Text>
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete="current-password"
        editable={!isSubmitting}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
        secureTextEntry
        style={authStyles.input}
        value={password}
      />
      {error ? (
        <Text accessibilityRole="alert" style={authStyles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void submit()}
        style={[authStyles.button, isSubmitting ? authStyles.buttonDisabled : null]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={authStyles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </AuthScreen>
  );
}
