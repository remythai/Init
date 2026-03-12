import * as Device from "expo-device";
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";
import { authService } from "./auth.service";

let Notifications: typeof import("expo-notifications") | null = null;

try {
  Notifications = require("expo-notifications");
} catch {
  console.warn("[PUSH] expo-notifications not available (Expo Go SDK 53+)");
}

export function setupNotificationHandler() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

setupNotificationHandler();

export function addNotificationResponseListener(
  callback: (response: any) => void
): { remove: () => void } {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) {
    console.warn("[PUSH] Notifications not available");
    return null;
  }

  if (!Device.isDevice) {
    console.warn("[PUSH] Not a physical device, aborting");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[PUSH] Permission denied");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  try {
    const tokenOptions = projectId ? { projectId } : {};
    const token = (
      await Notifications.getExpoPushTokenAsync(tokenOptions)
    ).data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (error) {
    console.error("[PUSH] Failed to get token:", error);
    return null;
  }
}

export async function registerAndSavePushToken(): Promise<void> {
  try {
    const pushToken = await registerForPushNotifications();

    if (pushToken) {
      const response = await authService.authenticatedFetch("/api/users/push-token", {
        method: "POST",
        body: JSON.stringify({ pushToken }),
      });

      if (!response.ok) {
        console.error("[PUSH] Save failed:", response.status);
      }
    }
  } catch (error) {
    console.error("[PUSH] registerAndSavePushToken error:", error);
  }
}
