import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function LoadingScreen() {
  return (
    <SafeAreaView accessibilityLabel="Loading session" style={styles.screen}>
      <ActivityIndicator color="#245a43" size="large" />
      <Text style={styles.label}>Loading your session…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#f7f4ed"
  },
  label: {
    color: "#4f5c54",
    fontSize: 16
  }
});
