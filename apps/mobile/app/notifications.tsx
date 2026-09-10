import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Platform, StyleSheet, Text } from "react-native";
import { AppScreen, BackHeader, InlineError, PrimaryButton, SecondaryButton, SurfaceCard } from "../src/design/components";
import { colors, spacing, typography } from "../src/design/theme";
import { pushNotificationApi } from "../src/notifications/api-client";
import { registerDeviceForPush } from "../src/notifications/registration";
import { pushStorage } from "../src/notifications/storage";

type NotificationModule = typeof import("expo-notifications");

export default function NotificationsSettings() {
  const router = useRouter();
  const expoGo = Constants.appOwnership === "expo";
  const [status, setStatus] = useState<string>(() => expoGo || Platform.OS === "web" ? "unavailable" : "unknown");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (expoGo || Platform.OS === "web") return;
    void import("expo-notifications")
      .then((notifications) => notifications.getPermissionsAsync())
      .then((permission) => setStatus(permission.status))
      .catch(() => setStatus("unavailable"));
  }, [expoGo]);

  const enable = async () => {
    if (expoGo || Platform.OS === "web") {
      setError("Push notifications require a development build on Android.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const notifications: NotificationModule = await import("expo-notifications");
      const id = await registerDeviceForPush(pushNotificationApi, notifications, Platform.OS === "ios" ? "ios" : "android");
      setStatus(id ? "granted" : "denied");
      if (!id) setError("Notifications are disabled in system settings.");
    } catch {
      setError("Couldn’t enable notifications right now.");
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    const id = await pushStorage.getTokenId();
    if (id) await pushNotificationApi.unregister(id);
    await pushStorage.clearTokenId();
    setStatus("disabled");
  };

  const statusLabel = status === "granted" ? "Notifications enabled" : status === "denied" ? "Notifications disabled" : status === "unavailable" ? "Requires a development build" : "Permission not requested";

  return <AppScreen><BackHeader title="Notifications" onBack={() => router.back()} /><Text style={styles.intro}>Replacement decisions and requests from your household appear here.</Text><SurfaceCard><Text style={styles.title}>Device status</Text><Text style={styles.status}>{statusLabel}</Text>{error ? <InlineError /> : null}{status === "granted" ? <SecondaryButton label="Turn off notifications" icon="bell-off" onPress={() => void disable()} /> : <PrimaryButton label="Enable notifications" icon="bell" loading={saving} onPress={() => void enable()} />}</SurfaceCard><SurfaceCard><Text style={styles.title}>What you’ll receive</Text><Text style={styles.meta}>Replacement requests needing your approval</Text><Text style={styles.meta}>Approval decisions on requests you sent</Text></SurfaceCard></AppScreen>;
}

const styles = StyleSheet.create({ intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg }, title: { ...typography.cardTitle, color: colors.text }, status: { ...typography.bodyStrong, color: colors.primary, marginTop: spacing.xs, marginBottom: spacing.md }, meta: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.sm } });
