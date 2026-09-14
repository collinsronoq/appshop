import Constants from "expo-constants";
import { Platform } from "react-native";

export function NotificationCoordinatorHost() {
  if (Platform.OS === "web" || Constants.appOwnership === "expo") {
    return null;
  }

  // Keep expo-notifications out of Expo Go while loading it synchronously in a
  // development build. React.lazy creates a Metro split-bundle request, which
  // can fail before the app renders when the emulator connects through 10.0.2.2.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NotificationCoordinator } = require("./notification-coordinator") as typeof import("./notification-coordinator");
  return <NotificationCoordinator />;
}
