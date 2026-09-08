import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/auth/auth-context";

export default function AuthenticatedHomeScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const signOut = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AUTHENTICATED</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Household Shopping
        </Text>
        <Text style={styles.body}>Signed in as {user?.display_name}</Text>
        <Text style={styles.note}>
          Your account is ready. Household features arrive in the next unit.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isLoggingOut}
          onPress={() => void signOut()}
          style={[styles.button, isLoggingOut ? styles.buttonDisabled : null]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#245a43" />
          ) : (
            <Text style={styles.buttonText}>Log out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f4ed"
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#d9eadf",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 20
  },
  badgeText: {
    color: "#245a43",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  title: {
    color: "#15251b",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.7
  },
  body: {
    color: "#26352c",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12
  },
  note: {
    color: "#5b685f",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9aaba0",
    borderRadius: 12,
    marginTop: 32
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: "#245a43",
    fontSize: 16,
    fontWeight: "700"
  }
});
