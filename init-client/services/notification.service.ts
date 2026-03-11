import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { authService } from "./auth.service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
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
}

export async function registerAndSavePushToken(): Promise<void> {
  try {
    const pushToken = await registerForPushNotifications();
    if (pushToken) {
      await authService.authenticatedFetch("/api/users/push-token", {
        method: "POST",
        body: JSON.stringify({ pushToken }),
      });
      console.log("Push token saved:", pushToken);
    }
  } catch (error) {
    console.error("Failed to register push token:", error);
  }
}