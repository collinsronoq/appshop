import { lazy, Suspense } from "react";
import Constants from "expo-constants";

const NotificationCoordinator = lazy(async () => {
  const module = await import("./notification-coordinator");
  return { default: module.NotificationCoordinator };
});

export function NotificationCoordinatorHost() {
  if (Constants.appOwnership === "expo") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <NotificationCoordinator />
    </Suspense>
  );
}
