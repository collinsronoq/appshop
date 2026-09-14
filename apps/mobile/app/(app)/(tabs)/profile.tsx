import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../../src/auth/auth-context";
import { AppHeader, AppScreen, SurfaceCard } from "../../../src/design/components";
import type { IconName } from "../../../src/design/components";
import { colors, iconSizes, radius, spacing, touchTargets, typography } from "../../../src/design/theme";
import { useHouseholds } from "../../../src/households/household-context";

type RowProps = { icon: IconName; label: string; onPress: () => void; destructive?: boolean };

function ProfileRow({ icon, label, onPress, destructive }: RowProps) {
  const color = destructive ? colors.danger : colors.primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
      <Feather color={color} name={icon} size={iconSizes.md} />
      <Text style={[styles.rowLabel, destructive ? styles.danger : null]}>{label}</Text>
      {!destructive ? <Feather color={colors.textSecondary} name="chevron-right" size={iconSizes.md} /> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { selected } = useHouseholds();
  return (
    <AppScreen>
      <AppHeader title="Profile" />
      <SurfaceCard style={styles.identityCard}>
        <View style={styles.flex}><Text style={styles.name}>{user?.display_name || user?.email}</Text><Text style={styles.email}>{user?.display_name ? user.email : "Account"}</Text></View>
      </SurfaceCard>

      <Text style={styles.sectionTitle}>Household</Text>
      <SurfaceCard style={styles.householdCard}>
        <View style={styles.householdIcon}><Feather color={colors.primary} name="home" size={iconSizes.md} /></View>
        <View style={styles.flex}><Text style={styles.householdName}>{selected?.name ?? "No household selected"}</Text><Text style={styles.email}>{selected ? `${selected.role === "owner" ? "Owner" : "Member"} · ${selected.member_count} member${selected.member_count === 1 ? "" : "s"}` : ""}</Text></View>
      </SurfaceCard>
      <SurfaceCard style={styles.group}>
        <ProfileRow icon="users" label="Members" onPress={() => router.push("/members")} />
        {selected?.role === "owner" ? <ProfileRow icon="user-plus" label="Invite member" onPress={() => router.push("/invite")} /> : null}
        <ProfileRow icon="repeat" label="Switch household" onPress={() => router.push("/households")} />
        {selected?.role === "owner" ? <ProfileRow icon="edit-2" label="Rename household" onPress={() => router.push("/household-settings")} /> : null}
      </SurfaceCard>

      <Text style={styles.sectionTitle}>App settings</Text>
      <SurfaceCard style={styles.group}>
        <ProfileRow icon="bell" label="Notifications" onPress={() => router.push("/notifications")} />
      </SurfaceCard>

      <Text style={styles.sectionTitle}>Account</Text>
      <SurfaceCard style={styles.group}>
        <ProfileRow destructive icon="log-out" label="Log out" onPress={() => void logout()} />
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },
  identityCard: { minHeight: 72, justifyContent: "center" },
  name: { ...typography.cardTitle, color: colors.text, fontSize: 18 },
  email: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  sectionTitle: { ...typography.sectionTitle, color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.sm },
  householdCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  householdIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySubtle },
  householdName: { ...typography.cardTitle, color: colors.text },
  group: { paddingVertical: 0 },
  row: { minHeight: touchTargets.minimum + 8, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  danger: { color: colors.danger }
});
