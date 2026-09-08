import { type PropsWithChildren, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer: ReactNode;
}>;

export function AuthScreen({ title, subtitle, footer, children }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandMark} accessibilityElementsHidden>
            <Text style={styles.brandGlyph}>H</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  label: {
    color: "#26352c",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#ccd4ce",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    color: "#15251b",
    fontSize: 16,
    paddingHorizontal: 15,
    marginBottom: 17
  },
  error: {
    borderRadius: 10,
    backgroundColor: "#fce9e7",
    color: "#8b2b21",
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    marginBottom: 16
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#245a43"
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  footerText: {
    color: "#526057",
    fontSize: 15,
    textAlign: "center"
  },
  footerLink: {
    color: "#245a43",
    fontWeight: "700"
  }
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f4ed"
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d9eadf",
    marginBottom: 28
  },
  brandGlyph: {
    color: "#245a43",
    fontSize: 23,
    fontWeight: "800"
  },
  title: {
    color: "#15251b",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.7
  },
  subtitle: {
    color: "#5b685f",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8
  },
  form: {
    marginTop: 30
  },
  footer: {
    marginTop: 24
  }
});
