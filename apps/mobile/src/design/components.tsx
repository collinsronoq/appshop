import type { ComponentProps, PropsWithChildren, ReactElement, ReactNode } from "react";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, iconSizes, radius, shadows, spacing, touchTargets, typography } from "./theme";

export type IconName = ComponentProps<typeof Feather>["name"];

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  keyboardSafe?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
}>;

export function AppScreen({ children, scroll = true, keyboardSafe = false, contentStyle, refreshControl, testID }: AppScreenProps) {
  const body = scroll ? (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.fill, contentStyle]} testID={testID}>{children}</View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      {keyboardSafe ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
          {body}
        </KeyboardAvoidingView>
      ) : body}
    </SafeAreaView>
  );
}

export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text numberOfLines={2} style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function BackHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: ReactNode }) {
  return (
    <View style={styles.backHeader}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.backButton}><Feather color={colors.text} name="arrow-left" size={iconSizes.md} /></Pressable>
      <View style={styles.headerCopy}><Text numberOfLines={1} style={styles.screenTitle}>{title}</Text>{subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}</View>
      {right ?? <View style={styles.backButtonPlaceholder} />}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function Button({ label, onPress, icon, disabled, loading, fullWidth = true, compact = false, style, variant }: ButtonProps & { variant: "primary" | "secondary" | "danger" }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.compactButton : null,
        fullWidth ? styles.fullWidth : null,
        variant === "primary" ? styles.primaryButton : styles.secondaryButton,
        variant === "danger" ? styles.dangerButton : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.surface : colors.primary} /> : (
        <>
          {icon ? <Feather color={variant === "primary" ? colors.surface : variant === "danger" ? colors.danger : colors.primary} name={icon} size={iconSizes.sm} /> : null}
          <Text style={[styles.buttonText, variant === "primary" ? styles.primaryButtonText : null, variant === "danger" ? styles.dangerText : null]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export const PrimaryButton = (props: ButtonProps) => <Button {...props} variant="primary" />;
export const SecondaryButton = (props: ButtonProps) => <Button {...props} variant="secondary" />;
export const DestructiveButton = (props: ButtonProps) => <Button {...props} variant="danger" />;

export function TertiaryButton({ label, onPress, icon, destructive = false, style }: { label: string; onPress: () => void; icon?: IconName; destructive?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.tertiaryButton, style]}>{icon ? <Feather color={destructive ? colors.danger : colors.primary} name={icon} size={iconSizes.sm} /> : null}<Text style={[styles.tertiaryText, destructive ? styles.dangerText : null]}>{label}</Text></Pressable>;
}

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.iconButton}>
      <Feather color={colors.primary} name={icon} size={iconSizes.md} />
    </Pressable>
  );
}

export function SurfaceCard({ children, style, accessibilityLabel }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; accessibilityLabel?: string }>) {
  return <View accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>{children}</View>;
}

export function InlineError({ onRetry }: { onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.inlineState}>
      <Feather color={colors.danger} name="alert-circle" size={iconSizes.sm} />
      <Text style={styles.inlineErrorText}>Couldn&apos;t load this section.</Text>
      {onRetry ? <Pressable onPress={onRetry}><Text style={styles.retry}>Retry</Text></Pressable> : null}
    </View>
  );
}

export function LoadingState({ rows = 2 }: { rows?: number }) {
  return <View accessibilityLabel="Loading section">{Array.from({ length: rows }, (_, index) => <View key={index} style={styles.skeleton} />)}</View>;
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <SurfaceCard style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Feather color={colors.primary} name={icon} size={iconSizes.lg} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </SurfaceCard>
  );
}

export function HouseholdSwitcher({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={`Switch household. Current household ${name}`} accessibilityRole="button" onPress={onPress} style={styles.switcher}>
      <Feather color={colors.primary} name="home" size={iconSizes.sm} />
      <Text numberOfLines={1} style={styles.switcherText}>{name}</Text>
      <Feather color={colors.textSecondary} name="chevron-down" size={16} />
    </Pressable>
  );
}

export function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed ? styles.pressed : null]}>
      <View style={styles.quickIcon}><Feather color={colors.primary} name={icon} size={iconSizes.md} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.sm },
  backHeader: { minHeight: touchTargets.comfortable, flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  backButton: { width: touchTargets.minimum, height: touchTargets.minimum, alignItems: "center", justifyContent: "center" },
  backButtonPlaceholder: { width: touchTargets.comfortable, height: touchTargets.comfortable },
  headerCopy: { flex: 1, minWidth: 0 },
  screenTitle: { ...typography.screenTitle, color: colors.text },
  headerSubtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  sectionHeader: { minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  sectionAction: { minHeight: touchTargets.minimum, justifyContent: "center", paddingLeft: spacing.lg },
  sectionActionText: { ...typography.secondary, color: colors.primary, fontWeight: "700" },
  button: { minHeight: touchTargets.comfortable, paddingHorizontal: spacing.lg, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  compactButton: { minHeight: touchTargets.minimum, paddingHorizontal: spacing.md },
  fullWidth: { alignSelf: "stretch" },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  dangerButton: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  buttonText: { ...typography.bodyStrong, color: colors.primary },
  primaryButtonText: { color: colors.surface },
  dangerText: { color: colors.danger },
  tertiaryButton: { minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.md },
  tertiaryText: { ...typography.bodyStrong, color: colors.primary },
  iconButton: { width: touchTargets.comfortable, height: touchTargets.comfortable, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  inlineState: { minHeight: touchTargets.comfortable, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  inlineErrorText: { ...typography.secondary, color: colors.textSecondary, flex: 1 },
  retry: { ...typography.bodyStrong, color: colors.primary, paddingVertical: spacing.sm },
  skeleton: { height: 62, borderRadius: radius.md, backgroundColor: colors.primarySubtle, marginBottom: spacing.sm, opacity: 0.6 },
  emptyCard: { alignItems: "flex-start" },
  emptyIcon: { width: touchTargets.comfortable, height: touchTargets.comfortable, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primarySubtle, marginBottom: spacing.md },
  emptyTitle: { ...typography.cardTitle, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  emptyAction: { alignSelf: "stretch", marginTop: spacing.lg },
  switcher: { alignSelf: "flex-start", maxWidth: "90%", minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  switcherText: { ...typography.bodyStrong, color: colors.text, flexShrink: 1 },
  quickAction: { flex: 1, minHeight: 84, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm },
  quickIcon: { width: 38, height: 38, borderRadius: radius.round, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  quickLabel: { ...typography.caption, color: colors.text, fontWeight: "700", textAlign: "center" }
});
