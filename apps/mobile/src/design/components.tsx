import { createContext, useContext, type ComponentProps, type PropsWithChildren, type ReactElement, type ReactNode } from "react";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.brandMark, { width: size, height: size, borderRadius: Math.round(size * 0.32) }]}>
      <Feather color={colors.surface} name="shopping-bag" size={Math.round(size * 0.52)} />
      <View style={styles.brandLeaf} />
    </View>
  );
}

export function GroceryPattern() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.pattern}>
      <Feather color={colors.sage} name="shopping-bag" size={36} style={[styles.patternIcon, { left: -8, top: 88, transform: [{ rotate: "-12deg" }] }]} />
      <Feather color={colors.sage} name="coffee" size={28} style={[styles.patternIcon, { right: 20, top: 180, transform: [{ rotate: "10deg" }] }]} />
      <Feather color={colors.sage} name="package" size={30} style={[styles.patternIcon, { left: 24, bottom: 130, transform: [{ rotate: "8deg" }] }]} />
      <Feather color={colors.sage} name="home" size={32} style={[styles.patternIcon, { right: -4, bottom: 54, transform: [{ rotate: "-8deg" }] }]} />
    </View>
  );
}

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  keyboardSafe?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
}>;

const AppShellContext = createContext(false);

export function AppShellProvider({ children }: PropsWithChildren) {
  return <AppShellContext.Provider value>{children}</AppShellContext.Provider>;
}

export function AppScreen({ children, scroll = true, keyboardSafe = false, contentStyle, refreshControl, testID }: AppScreenProps) {
  const shellOwnsSafeArea = useContext(AppShellContext);
  const body = scroll ? (
    <ScrollView
      automaticallyAdjustKeyboardInsets={!keyboardSafe}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
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
    <SafeAreaView edges={shellOwnsSafeArea ? [] : ["top", "left", "right"]} style={styles.screen}>
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

export function AppTopBar({
  variant = "root",
  title,
  initials,
  notificationCount = 0,
  onNotifications,
  onProfile,
  onBack,
  right,
  showProfile = true,
  showActions = variant === "root"
}: {
  variant?: "root" | "nested";
  title?: string;
  initials: string;
  notificationCount?: number;
  onNotifications: () => void;
  onProfile: () => void;
  onBack?: () => void;
  right?: ReactNode;
  showProfile?: boolean;
  showActions?: boolean;
}) {
  const avatarInitials = initials.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View accessibilityRole="header" style={styles.topBar}>
      {variant === "nested" ? <Pressable accessibilityLabel="Go back" accessibilityRole="button" disabled={!onBack} onPress={onBack} style={styles.topBarAction}><Feather color={colors.text} name="arrow-left" size={iconSizes.md} /></Pressable> : null}
      {variant === "root" ? <View style={styles.identityRow}><BrandMark size={34} /><Text style={styles.appIdentity}>AppShop</Text></View> : <Text ellipsizeMode="tail" numberOfLines={1} style={styles.nestedTitle}>{title ?? "AppShop"}</Text>}
      {variant === "nested" && right ? <View style={styles.topBarRight}>{right}</View> : showActions ? <View style={styles.topBarActions}>
        <Pressable accessibilityLabel="Open notifications" accessibilityRole="button" onPress={onNotifications} style={styles.topBarAction}>
          <Feather color={colors.primary} name="bell" size={iconSizes.md} />
          {notificationCount > 0 ? <View accessibilityLabel={`${notificationCount} pending notification${notificationCount === 1 ? "" : "s"}`} style={styles.notificationBadge} /> : null}
        </Pressable>
        {showProfile ? (
          <Pressable accessibilityLabel="Open profile" accessibilityRole="button" onPress={onProfile} style={styles.topBarAction}>
            <View style={styles.topBarAvatar}><Text style={styles.topBarAvatarText}>{avatarInitials}</Text></View>
          </Pressable>
        ) : null}
      </View> : <View style={styles.topBarActionPlaceholder} />}
    </View>
  );
}

export function ModalSheet({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
      <View style={styles.modalBackdrop}>
        <Pressable accessibilityLabel="Dismiss modal" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.modalSheet}>
          <View style={styles.modalSheetHeader}>
            <Text style={styles.modalSheetTitle}>{title}</Text>
            <Pressable accessibilityLabel="Close modal" accessibilityRole="button" onPress={onClose} style={styles.modalSheetClose}>
              <Feather color={colors.text} name="x" size={iconSizes.md} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function BackHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: ReactNode }) {
  const shellOwnsHeader = useContext(AppShellContext);
  if (shellOwnsHeader) {
    return right ? <View style={styles.nestedAction}>{right}</View> : null;
  }
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

export function InlineError({ message = "Couldn't load this section.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.inlineState}>
      <Feather color={colors.danger} name="alert-circle" size={iconSizes.sm} />
      <Text style={styles.inlineErrorText}>{message}</Text>
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
  screenContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.huge, flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.lg },
  backHeader: { minHeight: touchTargets.comfortable, flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  backButton: { width: touchTargets.minimum, height: touchTargets.minimum, alignItems: "center", justifyContent: "center" },
  backButtonPlaceholder: { width: touchTargets.comfortable, height: touchTargets.comfortable },
  headerCopy: { flex: 1, minWidth: 0 },
  brandMark: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  brandLeaf: { position: "absolute", width: 8, height: 5, top: 3, right: 5, borderTopLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: colors.sage },
  pattern: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden", opacity: 0.11 },
  patternIcon: { position: "absolute" },
  topBar: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.xs, paddingHorizontal: spacing.xl, backgroundColor: colors.appBarBackground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.appBarBorder },
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  appIdentity: { ...typography.sectionTitle, color: colors.primary, fontSize: 21, lineHeight: 26 },
  nestedTitle: { ...typography.cardTitle, color: colors.text, flex: 1, minWidth: 0 },
  nestedAction: { alignSelf: "flex-end", marginBottom: spacing.sm },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  topBarRight: { minHeight: touchTargets.comfortable, alignItems: "flex-end", justifyContent: "center" },
  topBarActionPlaceholder: { width: touchTargets.comfortable, height: touchTargets.comfortable },
  topBarAction: { width: touchTargets.comfortable, height: touchTargets.comfortable, alignItems: "center", justifyContent: "center" },
  topBarAvatar: { width: 38, height: 38, borderRadius: radius.round, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  topBarAvatarText: { ...typography.caption, color: colors.surface, fontWeight: "800" },
  notificationBadge: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: radius.round, backgroundColor: colors.warning },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,38,29,.28)" },
  modalSheet: { gap: spacing.md, backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxxl },
  modalSheetHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  modalSheetTitle: { ...typography.sectionTitle, color: colors.text, flex: 1 },
  modalSheetClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  screenTitle: { ...typography.screenTitle, color: colors.text },
  headerSubtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  sectionHeader: { minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  sectionTitle: { ...typography.sectionTitle, color: colors.text },
  sectionAction: { minHeight: touchTargets.minimum, justifyContent: "center", paddingLeft: spacing.lg },
  sectionActionText: { ...typography.secondary, color: colors.primary, fontWeight: "700" },
  button: { minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
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
  skeleton: { height: 68, borderRadius: radius.lg, backgroundColor: colors.primarySubtle, marginBottom: spacing.sm, opacity: 0.72 },
  emptyCard: { alignItems: "flex-start", backgroundColor: colors.backgroundQuiet },
  emptyIcon: { width: touchTargets.comfortable, height: touchTargets.comfortable, alignItems: "center", justifyContent: "center", borderRadius: radius.round, backgroundColor: colors.primarySubtle, marginBottom: spacing.md },
  emptyTitle: { ...typography.cardTitle, color: colors.text },
  emptyBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  emptyAction: { alignSelf: "stretch", marginTop: spacing.lg },
  switcher: { alignSelf: "flex-start", maxWidth: "90%", minHeight: touchTargets.minimum, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
  switcherText: { ...typography.bodyStrong, color: colors.text, flexShrink: 1 },
  quickAction: { flex: 1, minHeight: 88, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.sm },
  quickIcon: { width: 38, height: 38, borderRadius: radius.round, backgroundColor: colors.primarySubtle, alignItems: "center", justifyContent: "center" },
  quickLabel: { ...typography.caption, color: colors.text, fontWeight: "700", textAlign: "center" }
});
