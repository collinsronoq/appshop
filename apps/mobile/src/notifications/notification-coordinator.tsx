import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Alert, Platform } from "react-native";

import { useAuth } from "../auth/auth-context";
import { useHouseholds } from "../households/household-context";
import { pushNotificationApi } from "./api-client";
import { registerDeviceForPush } from "./registration";
import { pushStorage } from "./storage";
import type { SubstitutionNotificationData } from "./types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false
  })
});

export function notificationData(response: Notifications.NotificationResponse): SubstitutionNotificationData | null {
  const data = response.notification.request.content.data;
  if (!data) return null;
  const validType =
    data.type === "substitution.requested" ||
    data.type === "substitution.approved" ||
    data.type === "substitution.rejected";
  if (!validType || typeof data.household_id !== "string" || typeof data.trip_id !== "string" || typeof data.substitution_id !== "string") {
    return null;
  }
  return data as SubstitutionNotificationData;
}

function devicePlatform(): "ios" | "android" | null {
  return Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : null;
}

export function NotificationCoordinator() {
  const { status } = useAuth();
  const { households, selected, loading, selectHousehold } = useHouseholds();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingResponse, setPendingResponse] = useState<Notifications.NotificationResponse | null>(null);
  const registrationStarted = useRef(false);
  const processingResponse = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      registrationStarted.current = false;
      return;
    }
    if (!selected || registrationStarted.current) return;
    const platform = devicePlatform();
    if (!platform) return;
    registrationStarted.current = true;
    void Notifications.getPermissionsAsync().then(async (permission) => {
      if (permission.status === "denied") return;
      if (permission.status === "granted") {
        await registerDeviceForPush(pushNotificationApi, Notifications, platform);
        return;
      }
      if (await pushStorage.hasSeenPermissionContext()) return;
      await pushStorage.markPermissionContextSeen();
      Alert.alert(
        "Stay in sync while shopping",
        "Notifications let your household respond to replacement approvals and shopping decisions.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Enable notifications",
            onPress: () => void registerDeviceForPush(
              pushNotificationApi,
              Notifications,
              platform
            )
          }
        ]
      );
    }).catch(() => undefined);
  }, [selected, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const platform = devicePlatform();
    if (!platform) return;
    const subscription = Notifications.addPushTokenListener(() => {
      void registerDeviceForPush(
        pushNotificationApi,
        Notifications,
        platform
      ).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [status]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      setPendingResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) setPendingResponse(response);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notificationData({ notification } as Notifications.NotificationResponse);
      if (!data || !households.some((household) => household.id === data.household_id)) return;
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "substitutions"] }),
        queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "substitutions", data.substitution_id] }),
        queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "trips", data.trip_id] })
      ]);
    });
    return () => subscription.remove();
  }, [households, queryClient]);

  useEffect(() => {
    if (status !== "authenticated" || loading || !pendingResponse || processingResponse.current) return;
    processingResponse.current = true;
    const data = notificationData(pendingResponse);
    void (async () => {
      try {
        if (!data || !households.some((household) => household.id === data.household_id)) {
          Alert.alert("Notification unavailable", "This shopping decision is no longer available to your account.");
          return;
        }
        await selectHousehold(data.household_id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "substitutions"] }),
          queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "substitutions", data.substitution_id] }),
          queryClient.invalidateQueries({ queryKey: ["households", data.household_id, "trips", data.trip_id] })
        ]);
        router.push({ pathname: "/trip/[tripId]", params: { tripId: data.trip_id, substitutionId: data.substitution_id } });
      } finally {
        processingResponse.current = false;
        setPendingResponse(null);
      }
    })();
  }, [households, loading, pendingResponse, queryClient, router, selectHousehold, status]);

  return null;
}
