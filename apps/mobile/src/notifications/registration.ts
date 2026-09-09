import type * as Notifications from "expo-notifications";

import type { PushNotificationApiClient } from "./api-client";
import { pushStorage } from "./storage";

export type NotificationRegistrationAdapter = Pick<
  typeof Notifications,
  "getPermissionsAsync" | "requestPermissionsAsync" | "getExpoPushTokenAsync"
>;

export async function registerDeviceForPush(
  api: PushNotificationApiClient,
  notifications: NotificationRegistrationAdapter,
  platform: "ios" | "android"
): Promise<string | null> {
  let permission = await notifications.getPermissionsAsync();
  if (permission.status === "undetermined") {
    permission = await notifications.requestPermissionsAsync();
  }
  if (permission.status !== "granted") {
    return null;
  }
  const expoToken = await notifications.getExpoPushTokenAsync();
  const registration = await api.register(expoToken.data, platform);
  await pushStorage.setTokenId(registration.id);
  return registration.id;
}
