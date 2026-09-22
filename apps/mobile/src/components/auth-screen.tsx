import Feather from "@expo/vector-icons/Feather";
import { useState, type ComponentProps, type PropsWithChildren, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, GroceryPattern } from "../design/components";
import { colors, iconSizes, radius, spacing, touchTargets, typography } from "../design/theme";

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer: ReactNode;
  formTitle: string;
  onWelcome: () => void;
  variant: "login" | "signup";
}>;

export function AuthScreen({ title, subtitle, footer, formTitle, onWelcome, variant, children }: AuthScreenProps) {
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 720 || fontScale > 1.15;
  const illustrationHeight = variant === "signup" ? (compact ? 88 : 116) : (compact ? 104 : 148);
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GroceryPattern />
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={onWelcome} style={styles.welcomeAction}>
              <Feather color={colors.text} name="arrow-left" size={iconSizes.sm} />
              <Text style={styles.welcomeText}>Welcome</Text>
            </Pressable>
            <View style={styles.brandRow}><BrandMark size={34} /><Text style={styles.wordmark}>AppShop</Text></View>
          </View>
          <View style={[styles.intro, compact ? styles.introCompact : null]}>
            <View style={styles.introCopy}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" resizeMode="contain" source={require("../../assets/images/welcome-groceries.png")} style={[styles.illustration, { height: illustrationHeight }]} />
          </View>
          <View style={styles.formSurface}>
            <Text style={styles.formTitle}>{formTitle}</Text>
            <View style={styles.form}>{children}</View>
            <View style={styles.footer}>{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthPasswordField(props: ComponentProps<typeof TextInput>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={authStyles.inputWrap}>
      <TextInput {...props} secureTextEntry={!visible} style={authStyles.inputInWrap} />
      <Pressable accessibilityLabel={visible ? "Hide password" : "Show password"} accessibilityRole="button" onPress={() => setVisible((value) => !value)} style={authStyles.visibilityButton}>
        <Feather color={colors.textSecondary} name={visible ? "eye-off" : "eye"} size={iconSizes.sm} />
      </Pressable>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  label: {
    ...typography.secondary,
    fontFamily: "AppShopSansBold",
    color: colors.text,
    marginBottom: spacing.sm
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: "AppShopSans",
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg
  },
  inputWrap: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg
  },
  inputInWrap: {
    flex: 1,
    alignSelf: "stretch",
    color: colors.text,
    fontFamily: "AppShopSans",
    fontSize: 16,
    paddingHorizontal: spacing.lg
  },
  visibilityButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    alignItems: "center",
    justifyContent: "center"
  },
  error: {
    ...typography.secondary,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSurface,
    color: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    ...typography.bodyStrong,
    color: colors.surface,
    fontSize: 16
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center"
  },
  footerLink: {
    color: colors.primary,
    fontFamily: "AppShopSansBold"
  }
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl
  },
  topRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, zIndex: 1 },
  welcomeAction: { minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingRight: spacing.sm },
  welcomeText: { ...typography.bodyStrong, color: colors.text },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  wordmark: { ...typography.sectionTitle, color: colors.primary, fontSize: 20 },
  intro: { minHeight: 210, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg, zIndex: 1 },
  introCompact: { minHeight: 150, paddingVertical: spacing.sm },
  introCopy: { flex: 1, minWidth: 0 },
  title: {
    ...typography.display,
    color: colors.text,
    fontSize: 31,
    lineHeight: 35
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
    zIndex: 1
  },
  illustration: { width: "42%", maxWidth: 180 },
  formSurface: { zIndex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.xl },
  formTitle: { ...typography.screenTitle, color: colors.text, marginBottom: spacing.lg },
  form: { zIndex: 1 },
  footer: { marginTop: spacing.xl, zIndex: 1 }
});
