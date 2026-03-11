import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";
import { authService } from "./auth.service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  console.log("[PUSH] Starting registration...");
  console.log("[PUSH] isDevice:", Device.isDevice);

  if (!Device.isDevice) {
    console.warn("[PUSH] Not a physical device, aborting");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("[PUSH] Existing permission status:", existingStatus);
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("[PUSH] Requested permission, new status:", finalStatus);
  }

  if (finalStatus !== "granted") {
    console.warn("[PUSH] Permission denied");
    Alert.alert("Notifications", "Permission refusée pour les notifications");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log("[PUSH] Project ID:", projectId);

  try {
    const tokenOptions = projectId ? { projectId } : {};
    const token = (
      await Notifications.getExpoPushTokenAsync(tokenOptions)
    ).data;
    console.log("[PUSH] Got token:", token);

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
    Alert.alert("Notifications", "Erreur token: " + String(error));
    return null;
  }
}

export async function registerAndSavePushToken(): Promise<void> {
  try {
    console.log("[PUSH] registerAndSavePushToken called");
    const pushToken = await registerForPushNotifications();
    console.log("[PUSH] Token result:", pushToken);

    if (pushToken) {
      const response = await authService.authenticatedFetch("/api/users/push-token", {
        method: "POST",
        body: JSON.stringify({ pushToken }),
      });
      const data = await response.json().catch(() => null);
      console.log("[PUSH] Save response:", response.status, data);

      if (!response.ok) {
        Alert.alert("Push token", `Erreur serveur: ${response.status} - ${JSON.stringify(data)}`);
      } else {
        console.log("[PUSH] Token saved successfully");
      }
    } else {
      console.warn("[PUSH] No token obtained, nothing to save");
    }
  } catch (error) {
    console.error("[PUSH] registerAndSavePushToken error:", error);
    Alert.alert("Push token", "Erreur: " + String(error));
  }
}