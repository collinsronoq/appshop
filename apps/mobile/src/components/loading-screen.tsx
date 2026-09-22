import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../design/theme";

export function LoadingScreen() {
  return (
    <SafeAreaView accessibilityLabel="Loading session" style={styles.screen}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>Loading your session…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background
  },
  label: {
    ...typography.body,
    color: colors.textSecondary
  }
});
