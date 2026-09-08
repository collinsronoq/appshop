import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AuthApiError } from "../auth/api-client";
import { useAuth } from "../auth/auth-context";
import { validateRegistration } from "../auth/validation";
import { AuthScreen, authStyles } from "../components/auth-screen";

export function RegisterScreen() {
  const router = useRouter();
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const input = {
      display_name: displayName.trim(),
      email: email.trim().toLowerCase(),
      password
    };
    const validationError = validateRegistration(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(input);
      if (invite) router.replace({ pathname: "/invitation/[token]", params: { token: invite } });
    } catch (caught) {
      setError(
        caught instanceof AuthApiError
          ? caught.message
          : "Unable to create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Start a private shopping space for you and your household."
      footer={
        <Text style={authStyles.footerText}>
          Already have an account?{" "}
          <Text
            accessibilityRole="link"
            onPress={() => router.push("/login")}
            style={authStyles.footerLink}
          >
            Sign in
          </Text>
        </Text>
      }
    >
      <Text style={authStyles.label}>Display name</Text>
      <TextInput
        accessibilityLabel="Display name"
        autoCapitalize="words"
        autoComplete="name"
        editable={!isSubmitting}
        onChangeText={setDisplayName}
        returnKeyType="next"
        style={authStyles.input}
        value={displayName}
      />
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
        autoComplete="new-password"
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
          <Text style={authStyles.buttonText}>Create account</Text>
        )}
      </Pressable>
    </AuthScreen>
  );
}
